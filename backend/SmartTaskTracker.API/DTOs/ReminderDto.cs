using SmartTaskTracker.API.Models;

namespace SmartTaskTracker.API.DTOs;

public class TaskReminderDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime? DueDate { get; set; }
    public Priority Priority { get; set; }
    public int HoursUntilDue { get; set; }
    public bool IsOverdue { get; set; }
    public int? ParentTaskId { get; set; }
    public string? ParentTaskTitle { get; set; }
}

public class RemindersResponseDto
{
    public List<TaskReminderDto> UpcomingTasks { get; set; } = new();
    public List<TaskReminderDto> OverdueTasks { get; set; } = new();
}
