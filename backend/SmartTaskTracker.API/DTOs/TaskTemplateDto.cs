using System.ComponentModel.DataAnnotations;
using SmartTaskTracker.API.Models;

namespace SmartTaskTracker.API.DTOs;

public class TaskTemplateDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Priority Priority { get; set; }
    public RecurrenceType RecurrenceType { get; set; }
    public DateTime? RecurrenceEndDate { get; set; }
    public List<SubtaskTemplateDto>? Subtasks { get; set; }
    public string? Notes { get; set; }
    public int? EstimatedTimeMinutes { get; set; }
    public string? FileUrl { get; set; }
    public string? FileName { get; set; }
    public List<string>? Tags { get; set; }
    public DateTime? DueDate { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SubtaskTemplateDto
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Priority Priority { get; set; } = Priority.Medium;
    public List<SubtaskTemplateDto>? Subtasks { get; set; }
}

public class CreateTaskTemplateDto
{
    [Required(ErrorMessage = "Name is required")]
    [MinLength(1, ErrorMessage = "Name cannot be empty")]
    [MaxLength(100, ErrorMessage = "Name cannot exceed 100 characters")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Title is required")]
    [MinLength(1, ErrorMessage = "Title cannot be empty")]
    [MaxLength(200, ErrorMessage = "Title cannot exceed 200 characters")]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1000, ErrorMessage = "Description cannot exceed 1000 characters")]
    public string? Description { get; set; }

    public Priority Priority { get; set; } = Priority.Medium;
    public RecurrenceType RecurrenceType { get; set; } = RecurrenceType.None;
    public DateTime? RecurrenceEndDate { get; set; }
    public List<SubtaskTemplateDto>? Subtasks { get; set; }
    public string? Notes { get; set; }
    public int? EstimatedTimeMinutes { get; set; }
    public string? FileUrl { get; set; }
    public string? FileName { get; set; }
    public List<string>? Tags { get; set; }
    public DateTime? DueDate { get; set; }
}

public class UpdateTaskTemplateDto
{
    [Required(ErrorMessage = "Name is required")]
    [MinLength(1, ErrorMessage = "Name cannot be empty")]
    [MaxLength(100, ErrorMessage = "Name cannot exceed 100 characters")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Title is required")]
    [MinLength(1, ErrorMessage = "Title cannot be empty")]
    [MaxLength(200, ErrorMessage = "Title cannot exceed 200 characters")]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1000, ErrorMessage = "Description cannot exceed 1000 characters")]
    public string? Description { get; set; }

    public Priority Priority { get; set; } = Priority.Medium;
    public RecurrenceType RecurrenceType { get; set; } = RecurrenceType.None;
    public DateTime? RecurrenceEndDate { get; set; }
}
