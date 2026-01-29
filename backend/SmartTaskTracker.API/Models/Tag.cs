namespace SmartTaskTracker.API.Models;

public class Tag
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Color { get; set; } = "#6c757d"; // Default gray
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public ICollection<TaskTag> TaskTags { get; set; } = new List<TaskTag>();
}

public class TaskTag
{
    public int TaskId { get; set; }
    public Task Task { get; set; } = null!;
    
    public int TagId { get; set; }
    public Tag Tag { get; set; } = null!;
}
