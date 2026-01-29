namespace SmartTaskTracker.API.Models;

public class TaskTemplate
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Priority Priority { get; set; } = Priority.Medium;
    public RecurrenceType RecurrenceType { get; set; } = RecurrenceType.None;
    public DateTime? RecurrenceEndDate { get; set; }
    public string? SubtasksJson { get; set; }
    public string? Notes { get; set; }
    public int? EstimatedTimeMinutes { get; set; }
    public string? FileUrl { get; set; }
    public string? FileName { get; set; }
    public string? TagsJson { get; set; }
    public DateTime? DueDate { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
