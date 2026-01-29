using SmartTaskTracker.API.Models;

namespace SmartTaskTracker.API.DTOs;

public class TaskHistoryDto
{
    public int Id { get; set; }
    public int TaskId { get; set; }
    public HistoryAction Action { get; set; }
    public string ActionName { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string Details { get; set; } = string.Empty;
}
