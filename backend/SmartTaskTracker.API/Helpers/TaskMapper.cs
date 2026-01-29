using SmartTaskTracker.API.DTOs;
using SmartTaskTracker.API.Models;
using TaskModel = SmartTaskTracker.API.Models.Task;
using TaskStatus = SmartTaskTracker.API.Models.TaskStatus;

namespace SmartTaskTracker.API.Helpers;

public static class TaskMapper
{
    public static TaskDto ToDto(TaskModel task, List<int>? dependsOnTaskIds = null, List<string>? dependsOnTaskTitles = null, List<int>? blockedByTaskIds = null, bool canStart = true, List<TaskDto>? subtasks = null, int completedSubtasksCount = 0, int totalSubtasksCount = 0, Dictionary<string, string>? tags = null) => new()
    {
        Id = task.Id,
        Title = task.Title,
        Description = task.Description,
        IsCompleted = task.IsCompleted,
        CreatedAt = task.CreatedAt,
        DueDate = task.DueDate,
        Priority = task.Priority,
        Tags = tags ?? new Dictionary<string, string>(),
        FileUrl = task.FileUrl,
        FileName = task.FileName,
        RecurrenceType = task.RecurrenceType,
        RecurrenceEndDate = task.RecurrenceEndDate,
        IsArchived = task.IsArchived,
        Notes = task.Notes,
        TimeSpentSeconds = task.TimeSpentSeconds,
        EstimatedTimeMinutes = task.EstimatedTimeMinutes,
        Status = task.Status,
        StatusName = task.Status.ToString(),
        DependsOnTaskIds = dependsOnTaskIds ?? new List<int>(),
        DependsOnTaskTitles = dependsOnTaskTitles ?? new List<string>(),
        BlockedByTaskIds = blockedByTaskIds ?? new List<int>(),
        CanStart = canStart,
        ParentTaskId = task.ParentTaskId,
        Subtasks = subtasks ?? new List<TaskDto>(),
        CompletedSubtasksCount = completedSubtasksCount,
        TotalSubtasksCount = totalSubtasksCount,
        CustomOrder = task.CustomOrder
    };

    public static TaskModel ToEntity(CreateTaskDto dto, int userId) => new()
    {
        Title = dto.Title,
        Description = dto.Description,
        DueDate = dto.DueDate,
        Priority = dto.Priority,
        FileUrl = dto.FileUrl,
        FileName = dto.FileName,
        RecurrenceType = dto.RecurrenceType,
        RecurrenceEndDate = dto.RecurrenceEndDate,
        Notes = dto.Notes,
        TimeSpentSeconds = dto.TimeSpentSeconds,
        EstimatedTimeMinutes = dto.EstimatedTimeMinutes,
        Status = dto.Status,
        ParentTaskId = dto.ParentTaskId,
        UserId = userId
    };

    public static void UpdateEntity(TaskModel task, UpdateTaskDto dto)
    {
        task.Title = dto.Title;
        task.Description = dto.Description;
        task.DueDate = dto.DueDate;
        task.Priority = dto.Priority;
        task.FileUrl = dto.FileUrl;
        task.FileName = dto.FileName;
        task.RecurrenceType = dto.RecurrenceType;
        task.RecurrenceEndDate = dto.RecurrenceEndDate;
        task.Notes = dto.Notes;
        task.TimeSpentSeconds = dto.TimeSpentSeconds;
        task.EstimatedTimeMinutes = dto.EstimatedTimeMinutes;
        task.Status = dto.Status;
        // Preserve ParentTaskId - don't change it when updating a task
        // ParentTaskId should only be set when creating a subtask, not when updating
        // This prevents accidentally breaking parent-child relationships
        // task.ParentTaskId is NOT updated here - it remains unchanged
        
        // Only update CustomOrder if explicitly provided (for reordering)
        if (dto.CustomOrder.HasValue)
        {
            task.CustomOrder = dto.CustomOrder;
        }
        
        // Sync IsCompleted with Status for backward compatibility
        task.IsCompleted = dto.Status == TaskStatus.Completed;
    }
}

