using Microsoft.EntityFrameworkCore;
using SmartTaskTracker.API.Data;
using SmartTaskTracker.API.DTOs;
using SmartTaskTracker.API.Models;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace SmartTaskTracker.API.Services;

public class TaskTemplateService
{
    private readonly AppDbContext _context;
    private static readonly JsonSerializerOptions JsonOptions = new JsonSerializerOptions
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = false
    };

    public TaskTemplateService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<TaskTemplateDto>> GetTemplatesAsync(int userId)
    {
        var templates = await _context.TaskTemplates
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();

        return templates.Select(t => new TaskTemplateDto
        {
            Id = t.Id,
            Name = t.Name,
            Title = t.Title,
            Description = t.Description,
            Priority = t.Priority,
            RecurrenceType = t.RecurrenceType,
            RecurrenceEndDate = t.RecurrenceEndDate,
            Subtasks = string.IsNullOrWhiteSpace(t.SubtasksJson) 
                ? null 
                : JsonSerializer.Deserialize<List<SubtaskTemplateDto>>(t.SubtasksJson, JsonOptions),
            Notes = t.Notes,
            EstimatedTimeMinutes = t.EstimatedTimeMinutes,
            FileUrl = t.FileUrl,
            FileName = t.FileName,
            Tags = string.IsNullOrWhiteSpace(t.TagsJson) 
                ? null 
                : JsonSerializer.Deserialize<List<string>>(t.TagsJson, JsonOptions),
            DueDate = t.DueDate,
            CreatedAt = t.CreatedAt
        }).ToList();
    }

    public async Task<TaskTemplateDto?> GetTemplateByIdAsync(int id, int userId)
    {
        var template = await _context.TaskTemplates
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

        if (template == null) return null;

        return new TaskTemplateDto
        {
            Id = template.Id,
            Name = template.Name,
            Title = template.Title,
            Description = template.Description,
            Priority = template.Priority,
            RecurrenceType = template.RecurrenceType,
            RecurrenceEndDate = template.RecurrenceEndDate,
            Subtasks = string.IsNullOrWhiteSpace(template.SubtasksJson) 
                ? null 
                : JsonSerializer.Deserialize<List<SubtaskTemplateDto>>(template.SubtasksJson),
            Notes = template.Notes,
            EstimatedTimeMinutes = template.EstimatedTimeMinutes,
            FileUrl = template.FileUrl,
            FileName = template.FileName,
            Tags = string.IsNullOrWhiteSpace(template.TagsJson) 
                ? null 
                : JsonSerializer.Deserialize<List<string>>(template.TagsJson),
            DueDate = template.DueDate,
            CreatedAt = template.CreatedAt
        };
    }

    public async Task<TaskTemplateDto> CreateTemplateAsync(CreateTaskTemplateDto dto, int userId)
    {
        var template = new TaskTemplate
        {
            Name = dto.Name,
            Title = dto.Title,
            Description = dto.Description,
            Priority = dto.Priority,
            RecurrenceType = dto.RecurrenceType,
            RecurrenceEndDate = dto.RecurrenceEndDate,
            SubtasksJson = dto.Subtasks != null && dto.Subtasks.Count > 0
                ? JsonSerializer.Serialize(dto.Subtasks, JsonOptions)
                : null,
            Notes = dto.Notes,
            EstimatedTimeMinutes = dto.EstimatedTimeMinutes,
            FileUrl = dto.FileUrl,
            FileName = dto.FileName,
            TagsJson = dto.Tags != null && dto.Tags.Count > 0
                ? JsonSerializer.Serialize(dto.Tags, JsonOptions)
                : null,
            DueDate = dto.DueDate,
            UserId = userId
        };

        _context.TaskTemplates.Add(template);
        await _context.SaveChangesAsync();

        return new TaskTemplateDto
        {
            Id = template.Id,
            Name = template.Name,
            Title = template.Title,
            Description = template.Description,
            Priority = template.Priority,
            RecurrenceType = template.RecurrenceType,
            RecurrenceEndDate = template.RecurrenceEndDate,
            Subtasks = string.IsNullOrWhiteSpace(template.SubtasksJson) 
                ? null 
                : JsonSerializer.Deserialize<List<SubtaskTemplateDto>>(template.SubtasksJson),
            Notes = template.Notes,
            EstimatedTimeMinutes = template.EstimatedTimeMinutes,
            FileUrl = template.FileUrl,
            FileName = template.FileName,
            Tags = string.IsNullOrWhiteSpace(template.TagsJson) 
                ? null 
                : JsonSerializer.Deserialize<List<string>>(template.TagsJson),
            DueDate = template.DueDate,
            CreatedAt = template.CreatedAt
        };
    }

    public async Task<bool> UpdateTemplateAsync(int id, UpdateTaskTemplateDto dto, int userId)
    {
        var template = await _context.TaskTemplates
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

        if (template == null) return false;

        template.Name = dto.Name;
        template.Title = dto.Title;
        template.Description = dto.Description;
        template.Priority = dto.Priority;
        template.RecurrenceType = dto.RecurrenceType;
        template.RecurrenceEndDate = dto.RecurrenceEndDate;

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeleteTemplateAsync(int id, int userId)
    {
        var template = await _context.TaskTemplates
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

        if (template == null) return false;

        _context.TaskTemplates.Remove(template);
        await _context.SaveChangesAsync();
        return true;
    }
}
