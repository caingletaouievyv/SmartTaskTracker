using Microsoft.EntityFrameworkCore;
using SmartTaskTracker.API.Data;
using SmartTaskTracker.API.DTOs;
using SmartTaskTracker.API.Models;
using System.Text.Json;

namespace SmartTaskTracker.API.Services;

public class SettingsService
{
    private readonly AppDbContext _context;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public SettingsService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<SettingsDto?> GetSettingsAsync(int userId)
    {
        var settings = await _context.UserSettings
            .FirstOrDefaultAsync(s => s.UserId == userId);

        if (settings == null)
        {
            // Create default settings
            settings = new UserSettings
            {
                UserId = userId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.UserSettings.Add(settings);
            await _context.SaveChangesAsync();
        }

        return ToDto(settings);
    }

    public async Task<SettingsDto?> UpdateSettingsAsync(int userId, SettingsDto dto)
    {
        var settings = await _context.UserSettings
            .FirstOrDefaultAsync(s => s.UserId == userId);

        if (settings == null)
        {
            settings = new UserSettings { UserId = userId };
            _context.UserSettings.Add(settings);
        }

        settings.DefaultPriority = dto.DefaultPriority;
        settings.DefaultRecurrenceType = dto.DefaultRecurrenceType;
        settings.ReminderHoursAhead = dto.ReminderHoursAhead;
        settings.EnableNotifications = dto.EnableNotifications;
        settings.DateFormat = dto.DateFormat;
        settings.DefaultSortBy = dto.DefaultSortBy;
        settings.RememberSortBy = dto.RememberSortBy;
        settings.ExportDateFormat = dto.ExportDateFormat;
        settings.FontSize = dto.FontSize;
        settings.ExportIncludeSubtasks = dto.ExportIncludeSubtasks;
        settings.KeyboardShortcutsJson = JsonSerializer.Serialize(dto.KeyboardShortcuts, JsonOptions);
        settings.ExportFieldsJson = JsonSerializer.Serialize(dto.ExportFields, JsonOptions);
        settings.UIFieldsJson = JsonSerializer.Serialize(dto.UIFields, JsonOptions);
        settings.SearchFieldsJson = JsonSerializer.Serialize(dto.SearchFields, JsonOptions);
        settings.Theme = dto.Theme ?? "dark";
        settings.AccentColor = dto.AccentColor ?? "gray";
        settings.FilterPresetsJson = JsonSerializer.Serialize(dto.FilterPresets ?? new List<FilterPresetDto>(), JsonOptions);
        settings.LastSortBy = dto.LastSortBy ?? string.Empty;
        settings.ActiveTimerJson = dto.ActiveTimer != null ? JsonSerializer.Serialize(dto.ActiveTimer, JsonOptions) : string.Empty;
        settings.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return ToDto(settings);
    }

    private static SettingsDto ToDto(UserSettings settings)
    {
        var keyboardShortcuts = string.IsNullOrWhiteSpace(settings.KeyboardShortcutsJson)
            ? new Dictionary<string, string> { { "newTask", "n" }, { "focusSearch", "s" }, { "focusSearchAlt", "/" } }
            : JsonSerializer.Deserialize<Dictionary<string, string>>(settings.KeyboardShortcutsJson, JsonOptions) ?? new Dictionary<string, string>();

        var exportFields = string.IsNullOrWhiteSpace(settings.ExportFieldsJson)
            ? new Dictionary<string, bool> { { "title", true }, { "description", true }, { "status", true }, { "priority", true }, { "dueDate", true }, { "createdAt", true }, { "notes", false }, { "tags", true }, { "recurrence", true }, { "attachment", false }, { "timeSpent", false }, { "estimatedTime", false } }
            : JsonSerializer.Deserialize<Dictionary<string, bool>>(settings.ExportFieldsJson, JsonOptions) ?? new Dictionary<string, bool>();

        var uiFields = string.IsNullOrWhiteSpace(settings.UIFieldsJson)
            ? new Dictionary<string, bool> { { "description", true }, { "priority", true }, { "recurrence", true }, { "notes", true }, { "dueDate", true }, { "attachment", true } }
            : JsonSerializer.Deserialize<Dictionary<string, bool>>(settings.UIFieldsJson, JsonOptions) ?? new Dictionary<string, bool>();

        var searchFields = string.IsNullOrWhiteSpace(settings.SearchFieldsJson)
            ? new Dictionary<string, bool> { { "title", true }, { "description", true }, { "fileName", true } }
            : JsonSerializer.Deserialize<Dictionary<string, bool>>(settings.SearchFieldsJson, JsonOptions) ?? new Dictionary<string, bool>();

        var filterPresets = string.IsNullOrWhiteSpace(settings.FilterPresetsJson)
            ? new List<FilterPresetDto>()
            : JsonSerializer.Deserialize<List<FilterPresetDto>>(settings.FilterPresetsJson, JsonOptions) ?? new List<FilterPresetDto>();

        var activeTimer = string.IsNullOrWhiteSpace(settings.ActiveTimerJson)
            ? null
            : JsonSerializer.Deserialize<ActiveTimerDto>(settings.ActiveTimerJson, JsonOptions);

        return new SettingsDto
        {
            DefaultPriority = settings.DefaultPriority,
            DefaultRecurrenceType = settings.DefaultRecurrenceType,
            ReminderHoursAhead = settings.ReminderHoursAhead,
            EnableNotifications = settings.EnableNotifications,
            DateFormat = settings.DateFormat,
            DefaultSortBy = settings.DefaultSortBy,
            RememberSortBy = settings.RememberSortBy,
            ExportDateFormat = settings.ExportDateFormat,
            FontSize = settings.FontSize,
            KeyboardShortcuts = keyboardShortcuts,
            ExportFields = exportFields,
            ExportIncludeSubtasks = settings.ExportIncludeSubtasks,
            UIFields = uiFields,
            SearchFields = searchFields,
            Theme = settings.Theme ?? "dark",
            AccentColor = settings.AccentColor ?? "gray",
            FilterPresets = filterPresets,
            LastSortBy = settings.LastSortBy ?? string.Empty,
            ActiveTimer = activeTimer
        };
    }
}
