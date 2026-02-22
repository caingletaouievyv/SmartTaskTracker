using System.Globalization;
using System.Text.RegularExpressions;
using SmartTaskTracker.API.Models;

namespace SmartTaskTracker.API.Helpers;

/// <summary>State: Raw NL text or primitives. Intent: Parse for task fields. Action: Date/time/priority/string helpers (separation of concerns).</summary>
public static class NaturalLanguageParseHelper
{
    public static DateTime? TryParseDue(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return null;
        if (DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var d))
            return d;
        return ParseRelativeDate(s);
    }

    public static DateTime? ParseRelativeDate(string s)
    {
        var lower = s.Trim().ToLowerInvariant();
        var today = DateTime.UtcNow.Date;
        if (lower == "today") return today;
        if (lower == "tomorrow") return today.AddDays(1);
        var withNext = lower.StartsWith("next ", StringComparison.Ordinal) ? lower[5..] : lower;
        var days = new[] { DayOfWeek.Sunday, DayOfWeek.Monday, DayOfWeek.Tuesday, DayOfWeek.Wednesday, DayOfWeek.Thursday, DayOfWeek.Friday, DayOfWeek.Saturday };
        var names = new[] { "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday" };
        for (var i = 0; i < 7; i++)
        {
            if (names[i] != withNext) continue;
            var d = today;
            while (d.DayOfWeek != days[i]) d = d.AddDays(1);
            return d;
        }
        return null;
    }

    public static DateTime? TryParseExactDate(string s)
    {
        if (DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var d))
            return d;
        return null;
    }

    public static Priority ParsePriority(int? p)
    {
        if (p == 0) return Priority.Low;
        if (p == 2) return Priority.High;
        return Priority.Medium;
    }

    public static string? Truncate(string? value, int max)
    {
        if (string.IsNullOrEmpty(value)) return value;
        return value.Length <= max ? value : value[..max];
    }

    /// <summary>Parse "at 3pm", "3pm", "10:30am" → hour (0-23), minute (0-59).</summary>
    public static bool ParseAtTime(string s, out int hour, out int minute)
    {
        hour = 0;
        minute = 0;
        var t = Regex.Replace(s, @"\bat\s+", "", RegexOptions.IgnoreCase).Trim();
        var m = Regex.Match(t, @"^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$", RegexOptions.IgnoreCase);
        if (!m.Success) return false;
        var h = int.Parse(m.Groups[1].Value, CultureInfo.InvariantCulture);
        minute = m.Groups[2].Success ? int.Parse(m.Groups[2].Value, CultureInfo.InvariantCulture) : 0;
        var ampm = m.Groups[3].Value.ToLowerInvariant();
        if (ampm == "pm") hour = h == 12 ? 12 : h + 12;
        else if (ampm == "am") hour = h == 12 ? 0 : h;
        else hour = h;
        return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
    }

    public static string ToTitleCaseFirst(string s)
    {
        if (string.IsNullOrEmpty(s)) return s;
        return char.ToUpperInvariant(s[0]) + (s.Length > 1 ? s[1..] : "");
    }
}
