namespace SmartTaskTracker.API.DTOs;

public class TaskAnalyticsDto
{
    public int TotalTasks { get; set; }
    public int ActiveTasks { get; set; }
    public int CompletedTasks { get; set; }
    public int OverdueTasks { get; set; }
    public int HighPriorityTasks { get; set; }
    public int TasksThisWeek { get; set; }
    public int TasksThisMonth { get; set; }
    public Dictionary<string, int> TasksByPriority { get; set; } = new();
}
