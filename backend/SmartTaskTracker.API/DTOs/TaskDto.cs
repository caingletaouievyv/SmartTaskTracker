using System.ComponentModel.DataAnnotations;
using SmartTaskTracker.API.Models;
using TaskStatus = SmartTaskTracker.API.Models.TaskStatus;

namespace SmartTaskTracker.API.DTOs;

public class TaskDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? DueDate { get; set; }
    public Priority Priority { get; set; }
    public Dictionary<string, string> Tags { get; set; } = new(); // Key: tag name, Value: color hex
    public string? FileUrl { get; set; }
    public string? FileName { get; set; }
    public RecurrenceType RecurrenceType { get; set; } = RecurrenceType.None;
    public DateTime? RecurrenceEndDate { get; set; }
    public bool IsArchived { get; set; }
    public string? Notes { get; set; }
    public int TimeSpentSeconds { get; set; }
    public int? EstimatedTimeMinutes { get; set; }
    public TaskStatus Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public List<int> DependsOnTaskIds { get; set; } = new();
    public List<string> DependsOnTaskTitles { get; set; } = new();
    public List<int> BlockedByTaskIds { get; set; } = new();
    public bool CanStart { get; set; } = true;
    public int? ParentTaskId { get; set; }
    public List<TaskDto> Subtasks { get; set; } = new();
    public int CompletedSubtasksCount { get; set; }
    public int TotalSubtasksCount { get; set; }
    public int? CustomOrder { get; set; }
}

public class CreateTaskDto
{
    [Required(ErrorMessage = "Title is required")]
    [MinLength(1, ErrorMessage = "Title cannot be empty")]
    [MaxLength(200, ErrorMessage = "Title cannot exceed 200 characters")]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1000, ErrorMessage = "Description cannot exceed 1000 characters")]
    public string? Description { get; set; }

    public DateTime? DueDate { get; set; }
    public Priority Priority { get; set; } = Priority.Medium;
    public List<string> Tags { get; set; } = new();
    public string? FileUrl { get; set; }
    public string? FileName { get; set; }
    public RecurrenceType RecurrenceType { get; set; } = RecurrenceType.None;
    public DateTime? RecurrenceEndDate { get; set; }
    public string? Notes { get; set; }
    public int TimeSpentSeconds { get; set; } = 0;
    public int? EstimatedTimeMinutes { get; set; }
    public TaskStatus Status { get; set; } = TaskStatus.Active;
    public int? ParentTaskId { get; set; }
}

public class UpdateTaskDto
{
    [Required(ErrorMessage = "Title is required")]
    [MinLength(1, ErrorMessage = "Title cannot be empty")]
    [MaxLength(200, ErrorMessage = "Title cannot exceed 200 characters")]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1000, ErrorMessage = "Description cannot exceed 1000 characters")]
    public string? Description { get; set; }

    public bool IsCompleted { get; set; }
    public DateTime? DueDate { get; set; }
    public Priority Priority { get; set; } = Priority.Medium;
    public List<string> Tags { get; set; } = new();
    public string? FileUrl { get; set; }
    public string? FileName { get; set; }
    public RecurrenceType RecurrenceType { get; set; } = RecurrenceType.None;
    public DateTime? RecurrenceEndDate { get; set; }
    public string? Notes { get; set; }
    public int TimeSpentSeconds { get; set; } = 0;
    public int? EstimatedTimeMinutes { get; set; }
    public TaskStatus Status { get; set; } = TaskStatus.Active;
    public int? ParentTaskId { get; set; }
    public int? CustomOrder { get; set; }
}

public class BulkOperationDto
{
    [Required(ErrorMessage = "Task IDs are required")]
    [MinLength(1, ErrorMessage = "At least one task ID is required")]
    public List<int> TaskIds { get; set; } = new();
}

public class AddDependencyDto
{
    [Required(ErrorMessage = "DependsOnTaskId is required")]
    public int DependsOnTaskId { get; set; }
}

public class ParseNaturalLanguageRequest
{
    [Required(ErrorMessage = "Text is required")]
    [MaxLength(2000)]
    public string Text { get; set; } = string.Empty;
}

public class ReorderTasksDto
{
    [Required(ErrorMessage = "Task IDs are required")]
    [MinLength(1, ErrorMessage = "At least one task ID is required")]
    public List<int> TaskIds { get; set; } = new();
}
