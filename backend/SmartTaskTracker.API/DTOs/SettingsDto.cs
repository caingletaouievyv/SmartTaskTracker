namespace SmartTaskTracker.API.DTOs;

public class SettingsDto
{
    public int DefaultPriority { get; set; } = 1;
    public int DefaultRecurrenceType { get; set; } = 0;
    public int ReminderHoursAhead { get; set; } = 24;
    public bool EnableNotifications { get; set; } = true;
    public string DateFormat { get; set; } = "MM/DD/YYYY";
    public string DefaultSortBy { get; set; } = string.Empty;
    public bool RememberSortBy { get; set; } = false;
    public string ExportDateFormat { get; set; } = "MM/DD/YYYY";
    public string FontSize { get; set; } = "medium";
    public Dictionary<string, string> KeyboardShortcuts { get; set; } = new();
    public Dictionary<string, bool> ExportFields { get; set; } = new();
    public bool ExportIncludeSubtasks { get; set; } = true;
    public Dictionary<string, bool> UIFields { get; set; } = new();
    public Dictionary<string, bool> SearchFields { get; set; } = new();
    public string Theme { get; set; } = "dark";
    public string AccentColor { get; set; } = "gray";
    public List<FilterPresetDto> FilterPresets { get; set; } = new();
    public string LastSortBy { get; set; } = string.Empty;
    public ActiveTimerDto? ActiveTimer { get; set; }
}

public class ActiveTimerDto
{
    public int TaskId { get; set; }
    public long StartTime { get; set; }
}

public class FilterPresetDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Search { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string SortBy { get; set; } = string.Empty;
}
