using Microsoft.EntityFrameworkCore;
using SmartTaskTracker.API.Models;
using TaskModel = SmartTaskTracker.API.Models.Task;
using TaskStatus = SmartTaskTracker.API.Models.TaskStatus;

namespace SmartTaskTracker.API.Data;

public static class DbSeeder
{
    public static void SeedData(AppDbContext context)
    {
        var user = context.Users.FirstOrDefault(u => u.Username == "testuser");
        if (user == null)
        {
            user = new User
            {
                Username = "testuser",
                Email = "test@example.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
                CreatedAt = DateTime.UtcNow
            };
        context.Users.Add(user);
        context.SaveChanges();

        // Create default settings for user
        var userSettings = new UserSettings
        {
            UserId = user.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            ExportFieldsJson = "{\"title\":true,\"description\":true,\"status\":true,\"priority\":true,\"dueDate\":true,\"createdAt\":true,\"notes\":true,\"tags\":true,\"recurrence\":true,\"attachment\":true,\"timeSpent\":true,\"estimatedTime\":true}"
        };
        context.UserSettings.Add(userSettings);
        context.SaveChanges();
        }
        else
        {
            // Update password hash if user exists
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123");
            context.SaveChanges();
        }

        // Idempotency: avoid duplicating seed data on every restart
        if (context.Tasks.Any(t => t.UserId == user.Id))
        {
            return;
        }

        // Tags
        var tags = new List<Tag>
        {
            new Tag { Name = "Work", Color = "#3498db", UserId = user.Id },
            new Tag { Name = "Personal", Color = "#e74c3c", UserId = user.Id },
            new Tag { Name = "Urgent", Color = "#f39c12", UserId = user.Id },
            new Tag { Name = "Shopping", Color = "#2ecc71", UserId = user.Id },
            new Tag { Name = "Health", Color = "#9b59b6", UserId = user.Id },
            new Tag { Name = "Finance", Color = "#1abc9c", UserId = user.Id }
        };
        context.Tags.AddRange(tags);
        context.SaveChanges();

        // Tasks
        var tasks = new List<TaskModel>
        {
            new TaskModel
            {
                Title = "Complete project documentation",
                Description = "Write comprehensive documentation for the SmartTaskTracker project including API docs, user guide, and architecture notes",
                Priority = Priority.High,
                DueDate = DateTime.UtcNow.AddDays(2).Date.AddHours(17), // 5 PM in 2 days
                Status = TaskStatus.OnHold,
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-5),
                IsArchived = false,
                IsCompleted = false,
                Notes = "Focus on API endpoints and authentication flow",
                TimeSpentSeconds = 3600,
                EstimatedTimeMinutes = 240,
                RecurrenceType = RecurrenceType.None,
                RecurrenceEndDate = null,
                FileUrl = null,
                FileName = null,
                CustomOrder = 1
            },
            new TaskModel
            {
                Title = "Buy groceries",
                Description = "Milk, eggs, bread, vegetables, fruits, chicken, pasta",
                Priority = Priority.Medium,
                DueDate = DateTime.UtcNow.AddDays(1).Date.AddHours(10), // 10 AM tomorrow
                Status = TaskStatus.Active,
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-2),
                IsArchived = false,
                IsCompleted = false,
                Notes = "Check fridge before shopping",
                TimeSpentSeconds = 0,
                EstimatedTimeMinutes = 60,
                RecurrenceType = RecurrenceType.Weekly,
                RecurrenceEndDate = DateTime.UtcNow.AddMonths(3),
                FileUrl = null,
                FileName = null,
                CustomOrder = 2
            },
            new TaskModel
            {
                Title = "Schedule dentist appointment",
                Description = "Call to schedule routine checkup and cleaning",
                Priority = Priority.Low,
                DueDate = DateTime.UtcNow.AddDays(7),
                Status = TaskStatus.Active,
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-1),
                IsArchived = false,
                IsCompleted = false,
                Notes = "Prefer morning appointments",
                TimeSpentSeconds = 300, // 5 minutes
                EstimatedTimeMinutes = 15,
                RecurrenceType = RecurrenceType.None,
                RecurrenceEndDate = null,
                FileUrl = null,
                FileName = null,
                CustomOrder = 3
            },
            new TaskModel
            {
                Title = "Review code changes",
                Description = "Review pull request #42 for authentication improvements",
                Priority = Priority.High,
                DueDate = DateTime.UtcNow.AddHours(-2), // 2 hours ago (overdue)
                Status = TaskStatus.Active,
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-3),
                IsArchived = false,
                IsCompleted = false,
                Notes = "Check security implications",
                TimeSpentSeconds = 1800, // 30 minutes
                EstimatedTimeMinutes = 45,
                RecurrenceType = RecurrenceType.None,
                RecurrenceEndDate = null,
                FileUrl = null,
                FileName = null,
                CustomOrder = 4
            },
            new TaskModel
            {
                Title = "Plan weekend trip",
                Description = "Research hotels, activities, restaurants, and transportation",
                Priority = Priority.Medium,
                DueDate = DateTime.UtcNow.AddDays(5).Date.AddHours(16), // 4 PM in 5 days
                Status = TaskStatus.Active,
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-4),
                IsArchived = false,
                IsCompleted = false,
                Notes = "Budget: $500, prefer beach location",
                TimeSpentSeconds = 2400, // 40 minutes
                EstimatedTimeMinutes = 120,
                RecurrenceType = RecurrenceType.None,
                RecurrenceEndDate = null,
                FileUrl = null,
                FileName = null,
                CustomOrder = 5
            },
            new TaskModel
            {
                Title = "Complete sprint retrospective",
                Description = "Prepare and present sprint retrospective meeting",
                Priority = Priority.Medium,
                DueDate = DateTime.UtcNow.AddDays(-1).Date.AddHours(15), // 3 PM yesterday (overdue)
                Status = TaskStatus.Completed,
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-7),
                IsArchived = false,
                IsCompleted = true,
                Notes = "Meeting completed successfully",
                TimeSpentSeconds = 2700, // 45 minutes
                EstimatedTimeMinutes = 60,
                RecurrenceType = RecurrenceType.Weekly,
                RecurrenceEndDate = DateTime.UtcNow.AddMonths(6),
                FileUrl = null,
                FileName = null,
                CustomOrder = 6
            },
            new TaskModel
            {
                Title = "Archive old project files",
                Description = "Organize and archive completed project files from last quarter",
                Priority = Priority.Low,
                DueDate = DateTime.UtcNow.AddDays(10).Date.AddHours(12), // 12 PM in 10 days
                Status = TaskStatus.Completed,
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-10),
                IsArchived = true,
                IsCompleted = true,
                Notes = "Files archived successfully",
                TimeSpentSeconds = 5400, // 90 minutes
                EstimatedTimeMinutes = 180,
                RecurrenceType = RecurrenceType.None,
                RecurrenceEndDate = null,
                FileUrl = null,
                FileName = null,
                CustomOrder = null
            }
        };
        context.Tasks.AddRange(tasks);
        context.SaveChanges();

        // Subtasks
        var subtasks = new List<TaskModel>
        {
            new TaskModel
            {
                Title = "Write API documentation",
                Description = "Document all API endpoints",
                Priority = Priority.High,
                DueDate = DateTime.UtcNow.AddDays(1).Date.AddHours(10), // 10 AM tomorrow
                Status = TaskStatus.Active,
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-4),
                IsArchived = false,
                IsCompleted = false,
                Notes = "Use Swagger annotations",
                TimeSpentSeconds = 1800,
                EstimatedTimeMinutes = 120,
                RecurrenceType = RecurrenceType.None,
                RecurrenceEndDate = null,
                ParentTaskId = tasks[0].Id,
                CustomOrder = 1
            },
            new TaskModel
            {
                Title = "Create user guide",
                Description = "Write step-by-step user guide",
                Priority = Priority.Medium,
                DueDate = DateTime.UtcNow.AddDays(2).Date.AddHours(11), // 11 AM in 2 days
                Status = TaskStatus.Active,
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow.AddDays(-3),
                IsArchived = false,
                IsCompleted = false,
                Notes = "Include screenshots",
                TimeSpentSeconds = 600,
                EstimatedTimeMinutes = 90,
                RecurrenceType = RecurrenceType.None,
                RecurrenceEndDate = null,
                ParentTaskId = tasks[0].Id,
                CustomOrder = 2
            }
        };
        context.Tasks.AddRange(subtasks);
        context.SaveChanges();

        // Task tags
        var taskTags = new List<TaskTag>
        {
            new TaskTag { TaskId = tasks[0].Id, TagId = tags[0].Id },
            new TaskTag { TaskId = tasks[0].Id, TagId = tags[2].Id },
            new TaskTag { TaskId = tasks[1].Id, TagId = tags[1].Id },
            new TaskTag { TaskId = tasks[1].Id, TagId = tags[3].Id },
            new TaskTag { TaskId = tasks[2].Id, TagId = tags[1].Id },
            new TaskTag { TaskId = tasks[2].Id, TagId = tags[4].Id },
            new TaskTag { TaskId = tasks[3].Id, TagId = tags[0].Id },
            new TaskTag { TaskId = tasks[3].Id, TagId = tags[2].Id },
            new TaskTag { TaskId = tasks[4].Id, TagId = tags[1].Id },
            new TaskTag { TaskId = tasks[5].Id, TagId = tags[0].Id },
            new TaskTag { TaskId = tasks[6].Id, TagId = tags[0].Id },
            new TaskTag { TaskId = subtasks[0].Id, TagId = tags[0].Id },
            new TaskTag { TaskId = subtasks[0].Id, TagId = tags[2].Id },
            new TaskTag { TaskId = subtasks[1].Id, TagId = tags[0].Id }
        };
        context.TaskTags.AddRange(taskTags);

        // Task dependencies
        var dependencies = new List<TaskDependency>
        {
            new TaskDependency { TaskId = tasks[3].Id, DependsOnTaskId = tasks[0].Id },
            new TaskDependency { TaskId = subtasks[1].Id, DependsOnTaskId = subtasks[0].Id }
        };
        context.TaskDependencies.AddRange(dependencies);

        // Templates
        var templates = new List<TaskTemplate>
        {
            new TaskTemplate
            {
                Name = "Weekly Review",
                Title = "Weekly Review Meeting",
                Description = "Review progress and plan next week's tasks",
                Priority = Priority.Medium,
                RecurrenceType = RecurrenceType.Weekly,
                RecurrenceEndDate = DateTime.UtcNow.AddMonths(12),
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow,
                TagsJson = "[\"Work\"]",
                Notes = "Include team updates and blockers",
                EstimatedTimeMinutes = 60,
                FileUrl = null,
                FileName = null,
                DueDate = null,
                SubtasksJson = "[{\"title\":\"Prepare agenda\",\"description\":\"List discussion topics\"},{\"title\":\"Send meeting invite\",\"description\":\"Schedule with team\"}]"
            },
            new TaskTemplate
            {
                Name = "Grocery Shopping",
                Title = "Weekly Grocery Shopping",
                Description = "Buy weekly groceries and household items",
                Priority = Priority.Medium,
                RecurrenceType = RecurrenceType.Weekly,
                RecurrenceEndDate = DateTime.UtcNow.AddMonths(6),
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow,
                TagsJson = "[\"Personal\", \"Shopping\"]",
                Notes = "Check pantry before shopping",
                EstimatedTimeMinutes = 90,
                FileUrl = null,
                FileName = null,
                DueDate = DateTime.UtcNow.AddDays(7).Date.AddHours(9), // 9 AM in 7 days
                SubtasksJson = "[{\"title\":\"Make shopping list\",\"description\":\"Check what's needed\"},{\"title\":\"Go to store\",\"description\":\"Buy items\"}]"
            },
            new TaskTemplate
            {
                Name = "Code Review",
                Title = "Review Pull Request",
                Description = "Review and provide feedback on pull request",
                Priority = Priority.High,
                RecurrenceType = RecurrenceType.None,
                RecurrenceEndDate = null,
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow,
                TagsJson = "[\"Work\", \"Urgent\"]",
                Notes = "Focus on code quality and security",
                EstimatedTimeMinutes = 45,
                FileUrl = null,
                FileName = null,
                DueDate = null,
                SubtasksJson = "[{\"title\":\"Review code changes\",\"description\":\"Check logic and style\"},{\"title\":\"Test changes\",\"description\":\"Verify functionality\"},{\"title\":\"Provide feedback\",\"description\":\"Write review comments\"}]"
            },
            new TaskTemplate
            {
                Name = "Daily Standup",
                Title = "Daily Standup Meeting",
                Description = "Team daily standup to sync on progress",
                Priority = Priority.Medium,
                RecurrenceType = RecurrenceType.Daily,
                RecurrenceEndDate = DateTime.UtcNow.AddMonths(3),
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow,
                TagsJson = "[\"Work\"]",
                Notes = "Keep it brief - 15 minutes max",
                EstimatedTimeMinutes = 15,
                FileUrl = null,
                FileName = null,
                DueDate = null,
                SubtasksJson = null
            }
        };
        context.TaskTemplates.AddRange(templates);

        // Task history - all tasks get Created history, plus additional events
        var histories = new List<TaskHistory>
        {
            // Task 0: Complete project documentation
            new TaskHistory
            {
                TaskId = tasks[0].Id,
                Action = HistoryAction.Created,
                UserId = user.Id,
                Timestamp = tasks[0].CreatedAt,
                Details = $"Created \"{tasks[0].Title}\""
            },
            new TaskHistory
            {
                TaskId = tasks[0].Id,
                Action = HistoryAction.Updated,
                UserId = user.Id,
                Timestamp = DateTime.UtcNow.AddDays(-4),
                Details = "Status: Active → OnHold"
            },
            new TaskHistory
            {
                TaskId = tasks[0].Id,
                Action = HistoryAction.Updated,
                UserId = user.Id,
                Timestamp = DateTime.UtcNow.AddDays(-3),
                Details = "Description updated"
            },
            // Task 1: Buy groceries
            new TaskHistory
            {
                TaskId = tasks[1].Id,
                Action = HistoryAction.Created,
                UserId = user.Id,
                Timestamp = tasks[1].CreatedAt,
                Details = $"Created \"{tasks[1].Title}\""
            },
            // Task 2: Schedule dentist appointment
            new TaskHistory
            {
                TaskId = tasks[2].Id,
                Action = HistoryAction.Created,
                UserId = user.Id,
                Timestamp = tasks[2].CreatedAt,
                Details = $"Created \"{tasks[2].Title}\""
            },
            // Task 3: Review code changes
            new TaskHistory
            {
                TaskId = tasks[3].Id,
                Action = HistoryAction.Created,
                UserId = user.Id,
                Timestamp = tasks[3].CreatedAt,
                Details = $"Created \"{tasks[3].Title}\""
            },
            // Task 4: Plan weekend trip
            new TaskHistory
            {
                TaskId = tasks[4].Id,
                Action = HistoryAction.Created,
                UserId = user.Id,
                Timestamp = tasks[4].CreatedAt,
                Details = $"Created \"{tasks[4].Title}\""
            },
            // Task 5: Complete sprint retrospective
            new TaskHistory
            {
                TaskId = tasks[5].Id,
                Action = HistoryAction.Created,
                UserId = user.Id,
                Timestamp = tasks[5].CreatedAt,
                Details = $"Created \"{tasks[5].Title}\""
            },
            new TaskHistory
            {
                TaskId = tasks[5].Id,
                Action = HistoryAction.Completed,
                UserId = user.Id,
                Timestamp = DateTime.UtcNow.AddDays(-1),
                Details = "Marked completed"
            },
            // Task 6: Archive old project files
            new TaskHistory
            {
                TaskId = tasks[6].Id,
                Action = HistoryAction.Created,
                UserId = user.Id,
                Timestamp = tasks[6].CreatedAt,
                Details = $"Created \"{tasks[6].Title}\""
            },
            new TaskHistory
            {
                TaskId = tasks[6].Id,
                Action = HistoryAction.Completed,
                UserId = user.Id,
                Timestamp = DateTime.UtcNow.AddDays(-9),
                Details = "Marked completed"
            },
            new TaskHistory
            {
                TaskId = tasks[6].Id,
                Action = HistoryAction.Archived,
                UserId = user.Id,
                Timestamp = DateTime.UtcNow.AddDays(-8),
                Details = $"Archived \"{tasks[6].Title}\""
            },
            // Subtask 0: Write API documentation
            new TaskHistory
            {
                TaskId = subtasks[0].Id,
                Action = HistoryAction.Created,
                UserId = user.Id,
                Timestamp = subtasks[0].CreatedAt,
                Details = $"Created \"{subtasks[0].Title}\""
            },
            new TaskHistory
            {
                TaskId = subtasks[0].Id,
                Action = HistoryAction.Updated,
                UserId = user.Id,
                Timestamp = DateTime.UtcNow.AddDays(-3),
                Details = "Status: Active → InProgress"
            },
            // Subtask 1: Create user guide
            new TaskHistory
            {
                TaskId = subtasks[1].Id,
                Action = HistoryAction.Created,
                UserId = user.Id,
                Timestamp = subtasks[1].CreatedAt,
                Details = $"Created \"{subtasks[1].Title}\""
            }
        };
        context.TaskHistories.AddRange(histories);

        context.SaveChanges();
    }
}
