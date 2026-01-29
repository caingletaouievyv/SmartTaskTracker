namespace SmartTaskTracker.API.Models;

public enum Priority
{
    Low = 0,
    Medium = 1,
    High = 2
}

public enum RecurrenceType
{
    None = 0,
    Daily = 1,
    Weekly = 2,
    Monthly = 3
}

public enum TaskStatus
{
    Active = 0,
    InProgress = 1,
    OnHold = 2,
    Completed = 3,
    Cancelled = 4
}

public class Task
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DueDate { get; set; }
    public Priority Priority { get; set; } = Priority.Medium;
    public string? FileUrl { get; set; }
    public string? FileName { get; set; }
    public RecurrenceType RecurrenceType { get; set; } = RecurrenceType.None;
    public DateTime? RecurrenceEndDate { get; set; }
    public int? ParentTaskId { get; set; }
    public bool IsArchived { get; set; } = false;
    public string? Notes { get; set; }
    public int TimeSpentSeconds { get; set; } = 0;
    public int? EstimatedTimeMinutes { get; set; }
    public TaskStatus Status { get; set; } = TaskStatus.Active;
    public int? CustomOrder { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public ICollection<TaskTag> TaskTags { get; set; } = new List<TaskTag>();
}

