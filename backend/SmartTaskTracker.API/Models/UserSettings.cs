namespace SmartTaskTracker.API.Models;

public class UserSettings
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    
    // Default values
    public int DefaultPriority { get; set; } = 1; // Medium
    public int DefaultRecurrenceType { get; set; } = 0; // None
    public int ReminderHoursAhead { get; set; } = 24;
    public bool EnableNotifications { get; set; } = true;
    public string DateFormat { get; set; } = "MM/DD/YYYY";
    public string DefaultSortBy { get; set; } = string.Empty;
    public bool RememberSortBy { get; set; } = false;
    public string ExportDateFormat { get; set; } = "MM/DD/YYYY";
    public string FontSize { get; set; } = "medium"; // small, medium, large
    
    // Keyboard shortcuts (JSON)
    public string KeyboardShortcutsJson { get; set; } = "{\"newTask\":\"n\",\"focusSearch\":\"s\",\"focusSearchAlt\":\"/\"}";
    
    // Export fields (JSON)
    public string ExportFieldsJson { get; set; } = "{\"title\":true,\"description\":true,\"status\":true,\"priority\":true,\"dueDate\":true,\"createdAt\":true,\"notes\":true,\"tags\":true,\"recurrence\":true,\"attachment\":true,\"timeSpent\":true,\"estimatedTime\":true}";
    public bool ExportIncludeSubtasks { get; set; } = true;
    
    // UI fields (JSON)
    public string UIFieldsJson { get; set; } = "{\"description\":true,\"priority\":true,\"recurrence\":true,\"notes\":true,\"dueDate\":true,\"attachment\":true}";
    
    // Search fields (JSON)
    public string SearchFieldsJson { get; set; } = "{\"title\":true,\"description\":true,\"fileName\":true}";
    
    // Theme preferences
    public string Theme { get; set; } = "dark"; // light, dark
    public string AccentColor { get; set; } = "gray"; // gray, blue, purple, green, orange, red, teal
    
    // Filter presets (JSON)
    public string FilterPresetsJson { get; set; } = "[]";
    
    // Last sort preference
    public string LastSortBy { get; set; } = string.Empty;
    
    // Active timer (JSON)
    public string ActiveTimerJson { get; set; } = string.Empty;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
