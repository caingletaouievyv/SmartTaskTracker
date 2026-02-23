namespace SmartTaskTracker.API.DTOs;

public class TaskSearchResultDto
{
    public TaskDto Task { get; set; } = null!;
    public double? Score { get; set; }
}

public class TaskSuggestionDto
{
    public TaskDto Task { get; set; } = null!;
    public string? Reason { get; set; }
}

public class TagSuggestionDto
{
    public string Name { get; set; } = "";
    public string? Color { get; set; }
}
