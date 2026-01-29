namespace SmartTaskTracker.API.Models;

public class TaskDependency
{
    public int Id { get; set; }
    public int TaskId { get; set; }
    public int DependsOnTaskId { get; set; }
    
    // Navigation properties
    public Task Task { get; set; } = null!;
    public Task DependsOnTask { get; set; } = null!;
}
