namespace SmartTaskTracker.API.DTOs;

public class ErrorDto
{
    public string Message { get; set; } = string.Empty;
    public string? Details { get; set; }
    public int StatusCode { get; set; }
}
