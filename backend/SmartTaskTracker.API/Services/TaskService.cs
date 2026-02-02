using Microsoft.EntityFrameworkCore;
using SmartTaskTracker.API.Data;
using SmartTaskTracker.API.DTOs;
using SmartTaskTracker.API.Helpers;
using SmartTaskTracker.API.Models;
using TaskModel = SmartTaskTracker.API.Models.Task;
using TaskStatus = SmartTaskTracker.API.Models.TaskStatus;
using TaskAsync = System.Threading.Tasks.Task;

namespace SmartTaskTracker.API.Services;

public class TaskService
{
    private readonly AppDbContext _context;

    public TaskService(AppDbContext context)
    {
        _context = context;
    }

    public enum UpdateTaskResult
    {
        Success,
        NotFound,
        BlockedByDependencies
    }

    public async Task<List<TaskDto>> GetTasksAsync(int userId, string? search, string? status, string? sortBy, bool includeArchived = false, string? dueDate = null, int? priority = null, string? tags = null)
    {
        var query = _context.Tasks.Where(t => t.UserId == userId && !t.ParentTaskId.HasValue);
        
        if (!includeArchived)
        {
            query = query.Where(t => !t.IsArchived);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.ToLower();
            var taskIdsWithMatchingTags = await _context.TaskTags
                .Where(tt => tt.Tag.Name.ToLower().Contains(searchLower))
                .Select(tt => tt.TaskId)
                .Distinct()
                .ToListAsync();
            
            query = query.Where(t => 
                t.Title.ToLower().Contains(searchLower) || 
                (t.Description != null && t.Description.ToLower().Contains(searchLower)) ||
                (t.FileName != null && t.FileName.ToLower().Contains(searchLower)) ||
                taskIdsWithMatchingTags.Contains(t.Id)
            );
        }

        if (status == "active")
            query = query.Where(t => t.Status == TaskStatus.Active);
        else if (status == "inprogress")
            query = query.Where(t => t.Status == TaskStatus.InProgress);
        else if (status == "onhold")
            query = query.Where(t => t.Status == TaskStatus.OnHold);
        else if (status == "completed")
            query = query.Where(t => t.Status == TaskStatus.Completed);
        else if (status == "cancelled")
            query = query.Where(t => t.Status == TaskStatus.Cancelled);

        // Filter by priority
        if (priority.HasValue)
        {
            query = query.Where(t => t.Priority == (Priority)priority.Value);
        }

        // Filter by due date
        if (!string.IsNullOrEmpty(dueDate))
        {
            var now = DateTime.UtcNow;
            var today = now.Date;
            var weekEnd = today.AddDays(7);

            if (dueDate.ToLower() == "today")
            {
                query = query.Where(t => t.DueDate.HasValue && t.DueDate.Value.Date == today);
            }
            else if (dueDate.ToLower() == "week")
            {
                query = query.Where(t => t.DueDate.HasValue && t.DueDate.Value.Date >= today && t.DueDate.Value.Date < weekEnd);
            }
            else if (dueDate.ToLower() == "overdue")
            {
                query = query.Where(t => t.DueDate.HasValue && t.DueDate.Value < now && !t.IsCompleted);
            }
        }

        // Filter by tags
        if (!string.IsNullOrEmpty(tags))
        {
            var tagList = tags.Split(',', StringSplitOptions.RemoveEmptyEntries)
                              .Select(t => t.Trim().ToLower())
                              .ToList();
            
            if (tagList.Any())
            {
                var taskIdsWithMatchingTags = await _context.TaskTags
                    .Where(tt => tagList.Contains(tt.Tag.Name.ToLower()))
                    .Select(tt => tt.TaskId)
                    .Distinct()
                    .ToListAsync();
                
                query = query.Where(t => taskIdsWithMatchingTags.Contains(t.Id));
            }
        }

        query = sortBy switch
        {
            // Explicit sorts should not be overridden by custom drag-drop ordering
            "priority" => query.OrderByDescending(t => t.Priority).ThenByDescending(t => t.CreatedAt),
            "title" => query.OrderBy(t => t.Title).ThenByDescending(t => t.CreatedAt),
            "dueDate" => query.OrderBy(t => t.DueDate ?? DateTime.MaxValue).ThenByDescending(t => t.CreatedAt),
            "date" => query.OrderByDescending(t => t.CreatedAt),

            // Custom ordering (drag & drop) + default
            "custom" => query.OrderBy(t => t.CustomOrder ?? int.MaxValue).ThenByDescending(t => t.CreatedAt),
            _ => query.OrderBy(t => t.CustomOrder ?? int.MaxValue).ThenByDescending(t => t.CreatedAt)
        };

        var tasks = await query.ToListAsync();
        
        if (!tasks.Any())
            return new List<TaskDto>();
        
        var taskIds = tasks.Select(t => t.Id).ToList();
        
        var dependencies = await _context.TaskDependencies
            .Where(d => taskIds.Contains(d.TaskId) || taskIds.Contains(d.DependsOnTaskId))
            .ToListAsync();

        // Preload dependency task info (titles/statuses) for accurate canStart calculation
        var dependsOnIds = dependencies.Select(d => d.DependsOnTaskId).Distinct().ToList();
        var dependsOnInfo = dependsOnIds.Count == 0
            ? new Dictionary<int, (string Title, TaskStatus Status)>()
            : await _context.Tasks
                .Where(t => dependsOnIds.Contains(t.Id) && t.UserId == userId)
                .Select(t => new { t.Id, t.Title, t.Status })
                .ToDictionaryAsync(x => x.Id, x => (x.Title, x.Status));
        
        // Get tags for all tasks
        var taskTags = await _context.TaskTags
            .Where(tt => taskIds.Contains(tt.TaskId))
            .Include(tt => tt.Tag)
            .ToListAsync();
        
        // Get subtasks for all parent tasks
        var subtasks = await _context.Tasks
            .Where(t => t.ParentTaskId.HasValue && taskIds.Contains(t.ParentTaskId.Value) && t.UserId == userId)
            .OrderBy(t => t.CustomOrder ?? int.MaxValue)
            .ThenByDescending(t => t.CreatedAt)
            .ToListAsync();
        
        // Get all subtask tags upfront
        var allSubtaskIds = subtasks.Select(st => st.Id).ToList();
        var allSubtaskTags = await _context.TaskTags
            .Where(tt => allSubtaskIds.Contains(tt.TaskId))
            .Include(tt => tt.Tag)
            .ToListAsync();
        
        return tasks.Select(task =>
        {
            var dependsOn = dependencies.Where(d => d.TaskId == task.Id).Select(d => d.DependsOnTaskId).ToList();
            var dependsOnTitles = dependsOn.Select(depId => 
            {
                return dependsOnInfo.TryGetValue(depId, out var info) ? info.Title : string.Empty;
            }).Where(title => !string.IsNullOrEmpty(title)).ToList();
            var blockedBy = dependencies.Where(d => d.DependsOnTaskId == task.Id).Select(d => d.TaskId).ToList();
            var canStart = dependsOn.All(depId => 
            {
                return dependsOnInfo.TryGetValue(depId, out var info) && info.Status == TaskStatus.Completed;
            });
            
            // Get tags for this task with colors
            var tags = taskTags
                .Where(tt => tt.TaskId == task.Id)
                .ToDictionary(tt => tt.Tag.Name, tt => tt.Tag.Color);
            
            // Get subtasks for this task, ordered by CustomOrder
            var taskSubtasks = subtasks.Where(st => st.ParentTaskId == task.Id)
                .OrderBy(st => st.CustomOrder ?? int.MaxValue)
                .ThenByDescending(st => st.CreatedAt)
                .ToList();
            var subtaskDtos = taskSubtasks.Select(st => 
            {
                var stTags = allSubtaskTags
                    .Where(tt => tt.TaskId == st.Id)
                    .ToDictionary(tt => tt.Tag.Name, tt => tt.Tag.Color);
                return TaskMapper.ToDto(st, new List<int>(), new List<string>(), new List<int>(), true, new List<TaskDto>(), 0, 0, stTags);
            }).ToList();
            var completedSubtasks = taskSubtasks.Count(st => st.Status == TaskStatus.Completed);
            
            return TaskMapper.ToDto(task, dependsOn, dependsOnTitles, blockedBy, canStart, subtaskDtos, completedSubtasks, taskSubtasks.Count, tags);
        }).ToList();
    }

    public async Task<TaskDto?> GetTaskByIdAsync(int id, int userId)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (task == null) return null;
        
        var dependsOn = await _context.TaskDependencies
            .Where(d => d.TaskId == id)
            .Select(d => d.DependsOnTaskId)
            .ToListAsync();
        
        var blockedBy = await _context.TaskDependencies
            .Where(d => d.DependsOnTaskId == id)
            .Select(d => d.TaskId)
            .ToListAsync();
        
        var dependsOnTasks = await _context.Tasks
            .Where(t => dependsOn.Contains(t.Id) && t.UserId == userId)
            .ToListAsync();
        
        var dependsOnTitles = dependsOnTasks.Select(t => t.Title).ToList();
        
        var canStart = dependsOn.All(depId =>
        {
            var depTask = dependsOnTasks.FirstOrDefault(t => t.Id == depId);
            return depTask != null && depTask.Status == TaskStatus.Completed;
        });
        
        // Get tags for this task
        var tagsQuery = await _context.TaskTags
            .Where(tt => tt.TaskId == id)
            .Include(tt => tt.Tag)
            .ToListAsync();
        var tags = tagsQuery.ToDictionary(tt => tt.Tag.Name, tt => tt.Tag.Color);
        
        // Get subtasks if this is a parent task
        var subtasks = await _context.Tasks
            .Where(t => t.ParentTaskId == id && t.UserId == userId)
            .OrderBy(t => t.CustomOrder ?? int.MaxValue)
            .ThenByDescending(t => t.CreatedAt)
            .ToListAsync();
        
        var subtaskIds = subtasks.Select(st => st.Id).ToList();
        var subtaskTags = await _context.TaskTags
            .Where(tt => subtaskIds.Contains(tt.TaskId))
            .Include(tt => tt.Tag)
            .ToListAsync();
        
        var subtaskDtos = subtasks.Select(st =>
        {
            var stTags = subtaskTags
                .Where(tt => tt.TaskId == st.Id)
                .ToDictionary(tt => tt.Tag.Name, tt => tt.Tag.Color);
            return TaskMapper.ToDto(st, new List<int>(), new List<string>(), new List<int>(), true, new List<TaskDto>(), 0, 0, stTags);
        }).ToList();
        var completedSubtasks = subtasks.Count(st => st.Status == TaskStatus.Completed);
        
        return TaskMapper.ToDto(task, dependsOn, dependsOnTitles, blockedBy, canStart, subtaskDtos, completedSubtasks, subtasks.Count, tags);
    }

    public async Task<List<TaskDto>> GetSubtasksAsync(int parentTaskId, int userId)
    {
        // Verify parent task exists and belongs to user
        var parentTask = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == parentTaskId && t.UserId == userId);
        if (parentTask == null) return new List<TaskDto>();

        // Get subtasks
        var subtasks = await _context.Tasks
            .Where(t => t.ParentTaskId == parentTaskId && t.UserId == userId)
            .OrderBy(t => t.CustomOrder ?? int.MaxValue)
            .ThenByDescending(t => t.CreatedAt)
            .ToListAsync();

        if (!subtasks.Any()) return new List<TaskDto>();

        var subtaskIds = subtasks.Select(st => st.Id).ToList();
        var subtaskTags = await _context.TaskTags
            .Where(tt => subtaskIds.Contains(tt.TaskId))
            .Include(tt => tt.Tag)
            .ToListAsync();

        return subtasks.Select(st =>
        {
            var stTags = subtaskTags
                .Where(tt => tt.TaskId == st.Id)
                .ToDictionary(tt => tt.Tag.Name, tt => tt.Tag.Color);
            return TaskMapper.ToDto(st, new List<int>(), new List<string>(), new List<int>(), true, new List<TaskDto>(), 0, 0, stTags);
        }).ToList();
    }

    public async Task<List<TaskSuggestionDto>> GetSuggestedNextAsync(int userId, int? topK = null)
    {
        const int defaultTopK = 10;
        var k = topK ?? defaultTopK;
        var tasks = await GetTasksAsync(userId, null, null, "priority", includeArchived: false);
        var active = tasks.Where(t => !t.IsCompleted && t.StatusName != "Cancelled").ToList();
        var ordered = active
            .OrderByDescending(t => t.Priority)
            .ThenBy(t => t.DueDate ?? DateTime.MaxValue)
            .ThenByDescending(t => t.CanStart)
            .Take(k)
            .ToList();
        var results = new List<TaskSuggestionDto>();
        foreach (var t in ordered)
        {
            var reason = t.Priority == Priority.High ? "High priority"
                : t.DueDate.HasValue && (t.DueDate.Value.Date - DateTime.UtcNow.Date).TotalDays <= 7 ? "Due soon"
                : t.CanStart ? "Ready to start" : null;
            results.Add(new TaskSuggestionDto { Task = t, Reason = reason });
        }
        return results;
    }

    private async TaskAsync LogHistoryAsync(int taskId, HistoryAction action, int userId, string details = "")
    {
        var history = new TaskHistory
        {
            TaskId = taskId,
            Action = action,
            UserId = userId,
            Timestamp = DateTime.UtcNow,
            Details = details ?? string.Empty
        };
        _context.TaskHistories.Add(history);
        await _context.SaveChangesAsync();
    }

    private async Task<Tag> GetOrCreateTagAsync(string tagName, int userId)
    {
        var normalizedName = tagName.Trim();
        var tag = await _context.Tags
            .FirstOrDefaultAsync(t => t.Name.ToLower() == normalizedName.ToLower() && t.UserId == userId);
        
        if (tag == null)
        {
            tag = new Tag
            {
                Name = normalizedName,
                UserId = userId,
                Color = GenerateColorFromString(normalizedName)
            };
            _context.Tags.Add(tag);
            await _context.SaveChangesAsync();
        }
        
        return tag;
    }

    private static string GenerateColorFromString(string input)
    {
        var hash = 0;
        var hash2 = 0;
        var hash3 = 0;
        
        for (var i = 0; i < input.Length; i++)
        {
            var charValue = input[i];
            hash = ((hash << 5) - hash) + charValue;
            hash2 = ((hash2 << 7) - hash2) + (charValue * (i + 1) * 31);
            hash3 = ((hash3 << 3) - hash3) + (charValue * charValue);
        }
        
        hash += input.Length * 1000;
        if (input.Length > 0)
        {
            hash += input[0] * 100;
            hash += input[input.Length - 1] * 10;
        }
        
        var combinedHash = Math.Abs(hash) ^ Math.Abs(hash2) ^ Math.Abs(hash3);
        var hue = combinedHash % 360;
        var satHash = (combinedHash >> 8) % 100;
        var lightnessHash = (combinedHash >> 16) % 100;
        var saturation = 50 + (satHash % 30);
        var lightness = 35 + (lightnessHash % 25);
        
        // Convert HSL to RGB
        var c2 = (1 - Math.Abs(2 * lightness / 100.0 - 1)) * (saturation / 100.0);
        var x = c2 * (1 - Math.Abs((hue / 60.0) % 2 - 1));
        var m = lightness / 100.0 - c2 / 2;
        
        double r, g, b;
        if (hue < 60) { r = c2; g = x; b = 0; }
        else if (hue < 120) { r = x; g = c2; b = 0; }
        else if (hue < 180) { r = 0; g = c2; b = x; }
        else if (hue < 240) { r = 0; g = x; b = c2; }
        else if (hue < 300) { r = x; g = 0; b = c2; }
        else { r = c2; g = 0; b = x; }
        
        var red = Math.Clamp((int)Math.Round((r + m) * 255), 0, 255);
        var green = Math.Clamp((int)Math.Round((g + m) * 255), 0, 255);
        var blue = Math.Clamp((int)Math.Round((b + m) * 255), 0, 255);
        
        return $"#{red:X2}{green:X2}{blue:X2}";
    }

    private async TaskAsync UpdateTaskTagsAsync(TaskModel task, List<string> tagNames, int userId)
    {
        // Remove existing tags
        var existingTaskTags = await _context.TaskTags
            .Where(tt => tt.TaskId == task.Id)
            .ToListAsync();
        _context.TaskTags.RemoveRange(existingTaskTags);
        
        // Add new tags
        foreach (var tagName in tagNames.Where(t => !string.IsNullOrWhiteSpace(t)))
        {
            var tag = await GetOrCreateTagAsync(tagName, userId);
            var taskTag = new TaskTag
            {
                TaskId = task.Id,
                TagId = tag.Id
            };
            _context.TaskTags.Add(taskTag);
        }
    }

    public async Task<TaskDto> CreateTaskAsync(CreateTaskDto dto, int userId)
    {
        var task = TaskMapper.ToEntity(dto, userId);
        task.ParentTaskId = dto.ParentTaskId;
        _context.Tasks.Add(task);
        await _context.SaveChangesAsync();
        
        // Add tags
        if (dto.Tags != null && dto.Tags.Any())
        {
            await UpdateTaskTagsAsync(task, dto.Tags, userId);
        }
        
        await LogHistoryAsync(task.Id, HistoryAction.Created, userId, $"Created \"{task.Title}\"");
        
        // Log subtask addition on parent task
        if (dto.ParentTaskId.HasValue)
        {
            await LogHistoryAsync(dto.ParentTaskId.Value, HistoryAction.Updated, userId, $"Added subtask: \"{task.Title}\"");
        }
        
        // Get tags for response
        var tagsQuery = await _context.TaskTags
            .Where(tt => tt.TaskId == task.Id)
            .Include(tt => tt.Tag)
            .ToListAsync();
        var tags = tagsQuery.ToDictionary(tt => tt.Tag.Name, tt => tt.Tag.Color);
        
        // Get subtasks if this is a parent task
        var subtasks = await _context.Tasks
            .Where(t => t.ParentTaskId == task.Id && t.UserId == userId)
            .OrderBy(t => t.CustomOrder ?? int.MaxValue)
            .ThenByDescending(t => t.CreatedAt)
            .ToListAsync();
        
        var subtaskDtos = subtasks.Select(st => TaskMapper.ToDto(st, new List<int>(), new List<string>(), new List<int>(), true, new List<TaskDto>(), 0, 0, new Dictionary<string, string>())).ToList();
        var completedSubtasks = subtasks.Count(st => st.Status == TaskStatus.Completed);
        
        return TaskMapper.ToDto(task, new List<int>(), new List<string>(), new List<int>(), true, subtaskDtos, completedSubtasks, subtasks.Count, tags);
    }

    public async Task<UpdateTaskResult> UpdateTaskAsync(int id, UpdateTaskDto dto, int userId)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (task == null) return UpdateTaskResult.NotFound;

        var oldTitle = task.Title;
        var oldDescription = task.Description;
        var oldDueDate = task.DueDate;
        var oldPriority = task.Priority;
        var oldStatus = task.Status;
        var oldTimeSpentSeconds = task.TimeSpentSeconds;
        var oldEstimatedTimeMinutes = task.EstimatedTimeMinutes;
        var oldCustomOrder = task.CustomOrder;
        var isSubtask = task.ParentTaskId.HasValue;

        var wasCompleted = task.Status == TaskStatus.Completed;
        var isNowCompleted = dto.Status == TaskStatus.Completed;
        var hadRecurrence = task.RecurrenceType != RecurrenceType.None;

        // Block status changes until dependencies are completed
        if (dto.Status != task.Status)
        {
            var dependencies = await _context.TaskDependencies
                .Where(d => d.TaskId == id)
                .Select(d => d.DependsOnTaskId)
                .ToListAsync();

            if (dependencies.Any())
            {
                var depTasks = await _context.Tasks
                    .Where(t => dependencies.Contains(t.Id) && t.UserId == userId)
                    .Select(t => new { t.Id, t.Status })
                    .ToListAsync();

                var depStatus = depTasks.ToDictionary(t => t.Id, t => t.Status);
                var allCompleted = dependencies.All(depId =>
                    depStatus.TryGetValue(depId, out var status) && status == TaskStatus.Completed);

                if (!allCompleted)
                {
                    return UpdateTaskResult.BlockedByDependencies;
                }
            }
        }
        
        TaskMapper.UpdateEntity(task, dto);
        
        // Update tags
        if (dto.Tags != null)
        {
            await UpdateTaskTagsAsync(task, dto.Tags, userId);
        }
        
        // If recurring task was just completed, create next occurrence
        if (hadRecurrence && !wasCompleted && isNowCompleted)
        {
            await CreateNextRecurrenceAsync(task, userId);
        }
        
        await _context.SaveChangesAsync();
        
        // Log completion status changes
        if (wasCompleted != isNowCompleted)
        {
            var details = isNowCompleted ? "Marked completed" : "Marked uncompleted";
            await LogHistoryAsync(id, isNowCompleted ? HistoryAction.Completed : HistoryAction.Uncompleted, userId, details);
        }
        else
        {
            var changes = new List<string>();
            if (oldTitle != dto.Title) changes.Add($"Title: \"{oldTitle}\" → \"{dto.Title}\"");
            if ((oldDescription ?? "") != (dto.Description ?? "")) changes.Add("Description updated");
            if (oldPriority != dto.Priority) changes.Add($"Priority: {oldPriority} → {dto.Priority}");
            if (oldDueDate != dto.DueDate) changes.Add($"Due: {(oldDueDate.HasValue ? oldDueDate.Value.ToString("yyyy-MM-dd HH:mm") : "none")} → {(dto.DueDate.HasValue ? dto.DueDate.Value.ToString("yyyy-MM-dd HH:mm") : "none")}");
            if (oldStatus != dto.Status) changes.Add($"Status: {oldStatus} → {dto.Status}");
            if (oldTimeSpentSeconds != dto.TimeSpentSeconds) changes.Add($"Time: {oldTimeSpentSeconds}s → {dto.TimeSpentSeconds}s");
            if (oldEstimatedTimeMinutes != dto.EstimatedTimeMinutes) changes.Add($"Estimate: {(oldEstimatedTimeMinutes.HasValue ? $"{oldEstimatedTimeMinutes}m" : "none")} → {(dto.EstimatedTimeMinutes.HasValue ? $"{dto.EstimatedTimeMinutes}m" : "none")}");
            if (isSubtask && oldCustomOrder != dto.CustomOrder)
            {
                changes.Add("Subtask hierarchy changed");
                if (task.ParentTaskId.HasValue)
                {
                    var recentParentHistory = await _context.TaskHistories
                        .Where(h => h.TaskId == task.ParentTaskId.Value && 
                                   h.Details == "Subtask hierarchy changed" &&
                                   h.Timestamp > DateTime.UtcNow.AddSeconds(-2))
                        .AnyAsync();
                    if (!recentParentHistory)
                    {
                        await LogHistoryAsync(task.ParentTaskId.Value, HistoryAction.Updated, userId, "Subtask hierarchy changed");
                    }
                }
            }

            if (changes.Count > 0)
            {
                var details = string.Join("; ", changes);
                await LogHistoryAsync(id, HistoryAction.Updated, userId, details);
            }
        }
        
        return UpdateTaskResult.Success;
    }

    private async TaskAsync CreateNextRecurrenceAsync(TaskModel completedTask, int userId)
    {
        if (completedTask.RecurrenceType == RecurrenceType.None) return;
        
        var nextDueDate = completedTask.DueDate ?? DateTime.UtcNow;
        var recurrenceEnd = completedTask.RecurrenceEndDate ?? DateTime.UtcNow.AddYears(1);
        
        nextDueDate = completedTask.RecurrenceType switch
        {
            RecurrenceType.Daily => nextDueDate.AddDays(1),
            RecurrenceType.Weekly => nextDueDate.AddDays(7),
            RecurrenceType.Monthly => nextDueDate.AddMonths(1),
            _ => nextDueDate
        };

        if (nextDueDate > recurrenceEnd) return;

        // Check if a recurring task with the same title and due date already exists
        // This prevents duplicates when a task is completed, uncompleted, and completed again
        var existingTask = await _context.Tasks
            .FirstOrDefaultAsync(t => 
                t.UserId == userId && 
                t.Title == completedTask.Title && 
                t.DueDate.HasValue && 
                t.DueDate.Value.Date == nextDueDate.Date &&
                t.RecurrenceType == completedTask.RecurrenceType &&
                !t.IsArchived);

        // If a task already exists for this recurrence period, don't create a duplicate
        if (existingTask != null) return;

        var nextTask = new TaskModel
        {
            Title = completedTask.Title,
            Description = completedTask.Description,
            DueDate = nextDueDate,
            Priority = completedTask.Priority,
            FileUrl = completedTask.FileUrl,
            FileName = completedTask.FileName,
            RecurrenceType = completedTask.RecurrenceType,
            RecurrenceEndDate = completedTask.RecurrenceEndDate,
            // Don't set ParentTaskId for recurring tasks - they should be top-level tasks
            // Only subtasks should have ParentTaskId set
            ParentTaskId = null,
            UserId = userId,
            Status = TaskStatus.Active,
            IsCompleted = false
        };

        _context.Tasks.Add(nextTask);
    }

    public async Task<bool> DeleteTaskAsync(int id, int userId)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (task == null) return false;

        await LogHistoryAsync(id, HistoryAction.Deleted, userId, $"Deleted \"{task.Title}\"");
        _context.Tasks.Remove(task);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<TaskAnalyticsDto> GetAnalyticsAsync(int userId)
    {
        var tasks = await _context.Tasks.Where(t => t.UserId == userId).ToListAsync();
        var now = DateTime.UtcNow;
        var weekStart = now.AddDays(-(int)now.DayOfWeek);
        var monthStart = new DateTime(now.Year, now.Month, 1);

        return new TaskAnalyticsDto
        {
            TotalTasks = tasks.Count,
            ActiveTasks = tasks.Count(t => t.Status != TaskStatus.Completed && t.Status != TaskStatus.Cancelled),
            CompletedTasks = tasks.Count(t => t.Status == TaskStatus.Completed),
            OverdueTasks = tasks.Count(t => t.Status != TaskStatus.Completed && t.Status != TaskStatus.Cancelled && t.DueDate.HasValue && t.DueDate < now),
            HighPriorityTasks = tasks.Count(t => t.Status != TaskStatus.Completed && t.Status != TaskStatus.Cancelled && t.Priority == Priority.High),
            TasksThisWeek = tasks.Count(t => t.CreatedAt >= weekStart),
            TasksThisMonth = tasks.Count(t => t.CreatedAt >= monthStart),
            TasksByPriority = tasks
                .GroupBy(t => t.Priority.ToString())
                .ToDictionary(g => g.Key, g => g.Count())
        };
    }

    public async Task<RemindersResponseDto> GetRemindersAsync(int userId, int hoursAhead = 24)
    {
        var now = DateTime.UtcNow;
        var futureDate = now.AddHours(hoursAhead);
        
        var allTasks = await _context.Tasks
            .Where(t => t.UserId == userId 
                && t.Status != TaskStatus.Completed 
                && t.Status != TaskStatus.Cancelled 
                && t.DueDate.HasValue)
            .ToListAsync();

        var parentIds = allTasks
            .Where(t => t.ParentTaskId.HasValue)
            .Select(t => t.ParentTaskId!.Value)
            .Distinct()
            .ToList();

        var parentTitles = parentIds.Count == 0
            ? new Dictionary<int, string>()
            : await _context.Tasks
                .Where(t => parentIds.Contains(t.Id) && t.UserId == userId)
                .Select(t => new { t.Id, t.Title })
                .ToDictionaryAsync(x => x.Id, x => x.Title);

        var overdueTasks = allTasks
            .Where(t => t.DueDate < now)
            .Select(t => new TaskReminderDto
            {
                Id = t.Id,
                Title = t.Title,
                DueDate = t.DueDate,
                Priority = t.Priority,
                HoursUntilDue = (int)(now - t.DueDate!.Value).TotalHours,
                IsOverdue = true,
                ParentTaskId = t.ParentTaskId,
                ParentTaskTitle = t.ParentTaskId.HasValue && parentTitles.TryGetValue(t.ParentTaskId.Value, out var p1) ? p1 : null
            })
            .OrderBy(t => t.DueDate)
            .ToList();

        var upcomingTasks = allTasks
            .Where(t => t.DueDate >= now && t.DueDate <= futureDate)
            .Select(t => new TaskReminderDto
            {
                Id = t.Id,
                Title = t.Title,
                DueDate = t.DueDate,
                Priority = t.Priority,
                HoursUntilDue = (int)(t.DueDate!.Value - now).TotalHours,
                IsOverdue = false,
                ParentTaskId = t.ParentTaskId,
                ParentTaskTitle = t.ParentTaskId.HasValue && parentTitles.TryGetValue(t.ParentTaskId.Value, out var p2) ? p2 : null
            })
            .OrderBy(t => t.DueDate)
            .ToList();

        return new RemindersResponseDto
        {
            OverdueTasks = overdueTasks,
            UpcomingTasks = upcomingTasks
        };
    }

    public async Task<int> BulkDeleteTasksAsync(List<int> taskIds, int userId)
    {
        var tasks = await _context.Tasks
            .Where(t => taskIds.Contains(t.Id) && t.UserId == userId)
            .ToListAsync();
        
        if (!tasks.Any()) return 0;
        
        var taskIdsToDelete = tasks.Select(t => t.Id).ToList();
        
        // Delete related records first
        var dependencies = await _context.TaskDependencies
            .Where(d => taskIdsToDelete.Contains(d.TaskId) || taskIdsToDelete.Contains(d.DependsOnTaskId))
            .ToListAsync();
        _context.TaskDependencies.RemoveRange(dependencies);
        
        var taskTags = await _context.TaskTags
            .Where(tt => taskIdsToDelete.Contains(tt.TaskId))
            .ToListAsync();
        _context.TaskTags.RemoveRange(taskTags);
        
        var histories = await _context.TaskHistories
            .Where(h => taskIdsToDelete.Contains(h.TaskId))
            .ToListAsync();
        _context.TaskHistories.RemoveRange(histories);
        
        // Delete subtasks first (cascade)
        var subtasks = await _context.Tasks
            .Where(t => t.ParentTaskId.HasValue && taskIdsToDelete.Contains(t.ParentTaskId.Value) && t.UserId == userId)
            .ToListAsync();
        if (subtasks.Any())
        {
            var subtaskIds = subtasks.Select(t => t.Id).ToList();
            var subtaskDeps = await _context.TaskDependencies
                .Where(d => subtaskIds.Contains(d.TaskId) || subtaskIds.Contains(d.DependsOnTaskId))
                .ToListAsync();
            _context.TaskDependencies.RemoveRange(subtaskDeps);
            
            var subtaskTags = await _context.TaskTags
                .Where(tt => subtaskIds.Contains(tt.TaskId))
                .ToListAsync();
            _context.TaskTags.RemoveRange(subtaskTags);
            
            var subtaskHistories = await _context.TaskHistories
                .Where(h => subtaskIds.Contains(h.TaskId))
                .ToListAsync();
            _context.TaskHistories.RemoveRange(subtaskHistories);
            
            _context.Tasks.RemoveRange(subtasks);
        }
        
        // Delete parent tasks
        _context.Tasks.RemoveRange(tasks);
        await _context.SaveChangesAsync();
        
        return tasks.Count;
    }

    public async Task<int> BulkCompleteTasksAsync(List<int> taskIds, int userId)
    {
        var tasks = await _context.Tasks
            .Where(t => taskIds.Contains(t.Id) && t.UserId == userId && t.Status != TaskStatus.Completed && t.Status != TaskStatus.Cancelled)
            .ToListAsync();

        if (!tasks.Any()) return 0;

        // Preload dependencies for selected tasks
        var selectedIds = tasks.Select(t => t.Id).ToList();
        var deps = await _context.TaskDependencies
            .Where(d => selectedIds.Contains(d.TaskId))
            .ToListAsync();

        var allDepIds = deps.Select(d => d.DependsOnTaskId).Distinct().ToList();
        var depTasks = allDepIds.Count == 0
            ? new Dictionary<int, TaskStatus>()
            : await _context.Tasks
                .Where(t => allDepIds.Contains(t.Id) && t.UserId == userId)
                .Select(t => new { t.Id, t.Status })
                .ToDictionaryAsync(x => x.Id, x => x.Status);

        var completedCount = 0;

        foreach (var task in tasks)
        {
            var taskDeps = deps.Where(d => d.TaskId == task.Id).Select(d => d.DependsOnTaskId).ToList();
            if (taskDeps.Count > 0)
            {
                var allCompleted = taskDeps.All(depId =>
                    depTasks.TryGetValue(depId, out var status) && status == TaskStatus.Completed);
                if (!allCompleted)
                {
                    // Skip blocked tasks
                    continue;
                }
            }

            task.Status = TaskStatus.Completed;
            task.IsCompleted = true; // Sync for backward compatibility
            completedCount++;

            // Handle recurring tasks
            if (task.RecurrenceType != RecurrenceType.None)
            {
                await CreateNextRecurrenceAsync(task, userId);
            }
        }

        await _context.SaveChangesAsync();
        return completedCount;
    }

    public async Task<bool> ArchiveTaskAsync(int id, int userId)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (task == null) return false;

        task.IsArchived = true;
        await _context.SaveChangesAsync();
        await LogHistoryAsync(id, HistoryAction.Archived, userId, $"Archived \"{task.Title}\"");
        return true;
    }

    public async Task<bool> UnarchiveTaskAsync(int id, int userId)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
        if (task == null) return false;

        task.IsArchived = false;
        await _context.SaveChangesAsync();
        await LogHistoryAsync(id, HistoryAction.Unarchived, userId, $"Unarchived \"{task.Title}\"");
        return true;
    }

    public async Task<List<TaskHistoryDto>> GetTaskHistoryAsync(int taskId, int userId)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId);
        if (task == null) return new List<TaskHistoryDto>();

        var histories = await _context.TaskHistories
            .Where(h => h.TaskId == taskId)
            .OrderByDescending(h => h.Timestamp)
            .ToListAsync();

        return histories.Select(h => new TaskHistoryDto
        {
            Id = h.Id,
            TaskId = h.TaskId,
            Action = h.Action,
            ActionName = h.Action.ToString(),
            Timestamp = h.Timestamp,
            Details = h.Details ?? string.Empty
        }).ToList();
    }

    public async Task<int> ImportTasksFromCsvAsync(string csvContent, int userId)
    {
        var lines = csvContent.Split('\n', StringSplitOptions.RemoveEmptyEntries);
        if (lines.Length < 2) return 0; // Need at least header + 1 row

        var headers = lines[0].Split(',').Select(h => h.Trim().ToLower()).ToArray();
        var titleIndex = Array.IndexOf(headers, "title");
        if (titleIndex == -1) return 0; // Title is required

        var descriptionIndex = Array.IndexOf(headers, "description");
        var dueDateIndex = Array.IndexOf(headers, "duedate") != -1 ? Array.IndexOf(headers, "duedate") : Array.IndexOf(headers, "due date");
        var priorityIndex = Array.IndexOf(headers, "priority");
        var notesIndex = Array.IndexOf(headers, "notes");
        var tagsIndex = Array.IndexOf(headers, "tags");
        var recurrenceIndex = Array.IndexOf(headers, "recurrence");
        var fileNameIndex = Array.IndexOf(headers, "file name") != -1 ? Array.IndexOf(headers, "file name") : Array.IndexOf(headers, "filename");
        var timeSpentIndex = Array.IndexOf(headers, "time spent (seconds)") != -1 ? Array.IndexOf(headers, "time spent (seconds)") : Array.IndexOf(headers, "timespent");
        var estimatedTimeIndex = Array.IndexOf(headers, "estimated time (minutes)") != -1 ? Array.IndexOf(headers, "estimated time (minutes)") : (Array.IndexOf(headers, "estimatedtime") != -1 ? Array.IndexOf(headers, "estimatedtime") : Array.IndexOf(headers, "estimated time"));
        var parentTaskIndex = Array.IndexOf(headers, "parent task") != -1 ? Array.IndexOf(headers, "parent task") : Array.IndexOf(headers, "parenttask");

        var tasksToImport = new List<(TaskModel Task, List<string> Tags, string? ParentTaskTitle, int CsvRowIndex)>();
        
        for (int i = 1; i < lines.Length; i++)
        {
            var values = ParseCsvLine(lines[i]);
            if (values.Length <= titleIndex || string.IsNullOrWhiteSpace(values[titleIndex])) continue;

            var title = values[titleIndex].Trim();
            if (title.Length > 200) title = title.Substring(0, 200);

            var description = descriptionIndex >= 0 && descriptionIndex < values.Length ? values[descriptionIndex]?.Trim() : null;
            if (description != null && description.Length > 1000) description = description.Substring(0, 1000);

            DateTime? dueDate = null;
            if (dueDateIndex >= 0 && dueDateIndex < values.Length && !string.IsNullOrWhiteSpace(values[dueDateIndex]))
            {
                if (DateTime.TryParse(values[dueDateIndex].Trim(), out var parsedDate))
                {
                    dueDate = parsedDate;
                }
            }

            Priority priority = Priority.Medium;
            if (priorityIndex >= 0 && priorityIndex < values.Length && !string.IsNullOrWhiteSpace(values[priorityIndex]))
            {
                var priorityStr = values[priorityIndex].Trim().ToLower();
                priority = priorityStr switch
                {
                    "high" or "2" => Priority.High,
                    "low" or "0" => Priority.Low,
                    _ => Priority.Medium
                };
            }

            var notes = notesIndex >= 0 && notesIndex < values.Length ? values[notesIndex]?.Trim() : null;
            if (notes != null && notes.Length > 1000) notes = notes.Substring(0, 1000);

            int? estimatedTime = null;
            if (estimatedTimeIndex >= 0 && estimatedTimeIndex < values.Length && !string.IsNullOrWhiteSpace(values[estimatedTimeIndex]))
            {
                if (int.TryParse(values[estimatedTimeIndex].Trim(), out var parsedMinutes))
                {
                    estimatedTime = parsedMinutes;
                }
            }

            var tags = new List<string>();
            if (tagsIndex >= 0 && tagsIndex < values.Length && !string.IsNullOrWhiteSpace(values[tagsIndex]))
            {
                tags = values[tagsIndex].Trim().Split(new[] { ';', ',' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(t => t.Trim())
                    .Where(t => !string.IsNullOrWhiteSpace(t))
                    .ToList();
            }

            RecurrenceType recurrenceType = RecurrenceType.None;
            if (recurrenceIndex >= 0 && recurrenceIndex < values.Length && !string.IsNullOrWhiteSpace(values[recurrenceIndex]))
            {
                var recurrenceStr = values[recurrenceIndex].Trim().ToLower();
                recurrenceType = recurrenceStr switch
                {
                    "daily" or "1" => RecurrenceType.Daily,
                    "weekly" or "2" => RecurrenceType.Weekly,
                    "monthly" or "3" => RecurrenceType.Monthly,
                    _ => RecurrenceType.None
                };
            }

            string? fileName = null;
            if (fileNameIndex >= 0 && fileNameIndex < values.Length && !string.IsNullOrWhiteSpace(values[fileNameIndex]))
            {
                fileName = values[fileNameIndex].Trim();
                if (fileName.Length > 255) fileName = fileName.Substring(0, 255);
            }

            int timeSpentSeconds = 0;
            if (timeSpentIndex >= 0 && timeSpentIndex < values.Length && !string.IsNullOrWhiteSpace(values[timeSpentIndex]))
            {
                if (int.TryParse(values[timeSpentIndex].Trim(), out var parsedSeconds))
                {
                    timeSpentSeconds = parsedSeconds;
                }
            }

            string? parentTaskTitle = null;
            if (parentTaskIndex >= 0 && parentTaskIndex < values.Length && !string.IsNullOrWhiteSpace(values[parentTaskIndex]))
            {
                parentTaskTitle = values[parentTaskIndex].Trim().Trim('"');
            }

            var task = new TaskModel
            {
                Title = title,
                Description = description,
                DueDate = dueDate,
                Priority = priority,
                Notes = notes,
                EstimatedTimeMinutes = estimatedTime,
                RecurrenceType = recurrenceType,
                FileName = fileName,
                TimeSpentSeconds = timeSpentSeconds,
                CreatedAt = DateTime.UtcNow,
                CustomOrder = null,
                UserId = userId
            };

            tasksToImport.Add((task, tags, parentTaskTitle, i));
        }

        if (tasksToImport.Count == 0) return 0;

        // Separate parent tasks and subtasks
        var parentTasksToImport = tasksToImport.Where(t => string.IsNullOrWhiteSpace(t.ParentTaskTitle)).ToList();
        var subtasksToImport = tasksToImport.Where(t => !string.IsNullOrWhiteSpace(t.ParentTaskTitle)).OrderBy(t => t.CsvRowIndex).ToList();

        // First, import all parent tasks
        foreach (var (task, _, _, _) in parentTasksToImport)
        {
            _context.Tasks.Add(task);
        }
        await _context.SaveChangesAsync();

        // Create a dictionary to map parent task titles to their IDs (case-insensitive)
        var parentTaskMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var (task, _, _, _) in parentTasksToImport)
        {
            parentTaskMap[task.Title.Trim()] = task.Id;
        }

        // Import subtasks in CSV row order, preserving order per parent
        var subtaskOrderByParent = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var (task, _, parentTaskTitle, _) in subtasksToImport)
        {
            var parentKey = parentTaskTitle?.Trim().Trim('"');
            if (!string.IsNullOrWhiteSpace(parentKey) && parentTaskMap.TryGetValue(parentKey, out var parentTaskId))
            {
                task.ParentTaskId = parentTaskId;
                if (!subtaskOrderByParent.ContainsKey(parentKey))
                {
                    subtaskOrderByParent[parentKey] = 0;
                }
                task.CustomOrder = subtaskOrderByParent[parentKey]++;
            }
            _context.Tasks.Add(task);
        }
        await _context.SaveChangesAsync();

        // Update tags for all tasks
        foreach (var (task, tags, _, _) in tasksToImport)
        {
            if (tags != null && tags.Any())
            {
                await UpdateTaskTagsAsync(task, tags, userId);
            }
        }
        await _context.SaveChangesAsync();

        int imported = tasksToImport.Count;

        // Log history for imported tasks
        var importedTaskIds = tasksToImport.Select(t => t.Task.Id).ToList();
        foreach (var taskId in importedTaskIds)
        {
            var title = tasksToImport.FirstOrDefault(t => t.Task.Id == taskId).Task.Title;
            await LogHistoryAsync(taskId, HistoryAction.Created, userId, $"Imported \"{title}\"");
        }

        return imported;
    }

    private string[] ParseCsvLine(string line)
    {
        var result = new List<string>();
        var current = "";
        var inQuotes = false;

        foreach (var c in line)
        {
            if (c == '"')
            {
                inQuotes = !inQuotes;
            }
            else if (c == ',' && !inQuotes)
            {
                result.Add(current);
                current = "";
            }
            else
            {
                current += c;
            }
        }
        result.Add(current);
        return result.ToArray();
    }

    public async Task<(bool Success, string? ErrorMessage)> AddDependencyAsync(int taskId, int dependsOnTaskId, int userId)
    {
        // Check both tasks belong to user
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId);
        var dependsOnTask = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == dependsOnTaskId && t.UserId == userId);
        
        if (task == null || dependsOnTask == null) 
            return (false, "Task not found");
        
        if (taskId == dependsOnTaskId) 
            return (false, "A task cannot depend on itself");
        
        // Check for circular dependency
        var wouldCreateCycle = await WouldCreateCycleAsync(taskId, dependsOnTaskId);
        if (wouldCreateCycle) 
            return (false, "This would create a circular dependency");
        
        // Check if dependency already exists
        var exists = await _context.TaskDependencies
            .AnyAsync(d => d.TaskId == taskId && d.DependsOnTaskId == dependsOnTaskId);
        if (exists) 
            return (false, "Dependency already exists");
        
        _context.TaskDependencies.Add(new TaskDependency
        {
            TaskId = taskId,
            DependsOnTaskId = dependsOnTaskId
        });
        
        await _context.SaveChangesAsync();
        
        await LogHistoryAsync(taskId, HistoryAction.Updated, userId, $"Added dependency: \"{dependsOnTask.Title}\"");
        
        return (true, null);
    }

    public async Task<bool> RemoveDependencyAsync(int taskId, int dependsOnTaskId, int userId)
    {
        var task = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == taskId && t.UserId == userId);
        if (task == null) return false;
        
        var dependency = await _context.TaskDependencies
            .FirstOrDefaultAsync(d => d.TaskId == taskId && d.DependsOnTaskId == dependsOnTaskId);
        
        if (dependency == null) return false;
        
        var dependsOnTask = await _context.Tasks.FirstOrDefaultAsync(t => t.Id == dependsOnTaskId && t.UserId == userId);
        
        _context.TaskDependencies.Remove(dependency);
        await _context.SaveChangesAsync();
        
        if (dependsOnTask != null)
        {
            await LogHistoryAsync(taskId, HistoryAction.Updated, userId, $"Removed dependency: \"{dependsOnTask.Title}\"");
        }
        
        return true;
    }

    public async Task<bool> UpdateTaskOrderAsync(List<int> taskIds, int userId)
    {
        var tasks = await _context.Tasks
            .Where(t => taskIds.Contains(t.Id) && t.UserId == userId)
            .ToListAsync();
        
        if (tasks.Count != taskIds.Count)
            return false;
        
        for (int i = 0; i < taskIds.Count; i++)
        {
            var task = tasks.FirstOrDefault(t => t.Id == taskIds[i]);
            if (task != null && task.CustomOrder != i)
            {
                task.CustomOrder = i;
                await LogHistoryAsync(task.Id, HistoryAction.Updated, userId, "Subtask hierarchy changed");
            }
        }
        
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task<bool> WouldCreateCycleAsync(int taskId, int dependsOnTaskId)
    {
        // Check if dependsOnTaskId depends on taskId (directly or indirectly)
        var visited = new HashSet<int>();
        var toCheck = new Queue<int>();
        toCheck.Enqueue(dependsOnTaskId);
        
        while (toCheck.Count > 0)
        {
            var current = toCheck.Dequeue();
            if (current == taskId) return true; // Cycle detected
            if (visited.Contains(current)) continue;
            visited.Add(current);
            
            var dependencies = await _context.TaskDependencies
                .Where(d => d.TaskId == current)
                .Select(d => d.DependsOnTaskId)
                .ToListAsync();
            
            foreach (var dep in dependencies)
            {
                toCheck.Enqueue(dep);
            }
        }
        
        return false;
    }
}

