namespace SmartTaskTracker.API.Models;

public enum HistoryAction
{
    Created = 0,
    Updated = 1,
    Completed = 2,
    Uncompleted = 3,
    Deleted = 4,
    Archived = 5,
    Unarchived = 6
}

public class TaskHistory
{
    public int Id { get; set; }
    public int TaskId { get; set; }
    public HistoryAction Action { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string Details { get; set; } = string.Empty;
    public int UserId { get; set; }
    public Task Task { get; set; } = null!;
    public User User { get; set; } = null!;
}
