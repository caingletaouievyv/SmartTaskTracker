using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using SmartTaskTracker.API.DTOs;
using SmartTaskTracker.API.Helpers;
using SmartTaskTracker.API.Models;
using TaskStatus = SmartTaskTracker.API.Models.TaskStatus;
using RecurrenceType = SmartTaskTracker.API.Models.RecurrenceType;

namespace SmartTaskTracker.API.Services;

/// <summary>State: User input is free text. Intent: Get structured task (title, due, priority). Action: LLM parse when key present; else keyword fallback.</summary>
public class NaturalLanguageTaskService
{
    private readonly TaskMemoryOptions _options;
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<NaturalLanguageTaskService> _logger;

    public NaturalLanguageTaskService(
        IOptions<TaskMemoryOptions> options,
        IHttpClientFactory httpFactory,
        ILogger<NaturalLanguageTaskService> logger)
    {
        _options = options.Value;
        _httpFactory = httpFactory;
        _logger = logger;
    }

    private string? GetLlmApiKey() =>
        Environment.GetEnvironmentVariable("OPENAI_API_KEY")
        ?? Environment.GetEnvironmentVariable("AI_KEY")
        ?? _options.LlmApiKey;

    private (string baseUrl, string model) GetLlmEndpoint()
    {
        if (!string.IsNullOrWhiteSpace(_options.LlmBaseUrl))
        {
            var model = !string.IsNullOrWhiteSpace(_options.LlmModel) ? _options.LlmModel.Trim() : "gpt-4o-mini";
            return (_options.LlmBaseUrl!.Trim().TrimEnd('/'), model);
        }
        var provider = (Environment.GetEnvironmentVariable("MODEL_PROVIDER") ?? _options.LlmProvider)?.Trim().Equals("deepseek", StringComparison.OrdinalIgnoreCase) == true
            ? "deepseek" : "openai";
        if (provider == "deepseek")
            return ("https://api.deepseek.com/v1", !string.IsNullOrWhiteSpace(_options.LlmModel) ? _options.LlmModel.Trim() : "deepseek-chat");
        return ("https://api.openai.com/v1", !string.IsNullOrWhiteSpace(_options.LlmModel) ? _options.LlmModel.Trim() : "gpt-4o-mini");
    }

    public async Task<CreateTaskDto> ParseAsync(string text, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text))
            return FallbackParse(text ?? "");

        var key = GetLlmApiKey();
        if (!string.IsNullOrEmpty(key))
        {
            var parsed = await TryLlmParseAsync(text.Trim(), key, ct);
            if (parsed != null)
                return parsed;
        }

        _logger.LogInformation("NL task: keyword fallback for \"{Text}\"", text.Length > 50 ? text[..50] + "..." : text);
        return FallbackParse(text.Trim());
    }

    private async Task<CreateTaskDto?> TryLlmParseAsync(string text, string apiKey, CancellationToken ct)
    {
        try
        {
            var (baseUrl, model) = GetLlmEndpoint();
            _logger.LogInformation("NL task LLM endpoint: {BaseUrl}, model: {Model}", baseUrl, model);
            var url = $"{baseUrl}/chat/completions";

            var systemPrompt = "You parse natural language into a task. Reply with ONLY a JSON object, no markdown. Use exactly these keys: title, description, dueDate, priority, tags, notes, estimatedTimeMinutes, recurrenceType, recurrenceEndDate. You MUST fill every field you can infer. Rules: title = task name only (e.g. \"Review exam\"), first letter capitalized. dueDate = ISO 8601 with timezone; use CURRENT or NEXT year (e.g. 2026-02-23T08:00:00Z for \"tomorrow morning\"; morning=08:00, afternoon=14:00, evening=18:00). priority: 0=Low, 1=Medium, 2=High. description = extra context (e.g. \"Morning\" for \"tomorrow morning\"). tags = array of 1-5 strings derived from the task (e.g. \"review report\" -> [\"report\"] or [\"review\", \"report\"]); never return empty tags when the user gave a task name. estimatedTimeMinutes = number if \"30 min\" or \"1 hour\". recurrenceType: 1=Daily, 2=Weekly, 3=Monthly for \"every day\" or \"weekly\". Never leave dueDate null if user said a date/time. Never leave tags empty if there is a task name.";
            var userPrompt = $"Parse into task JSON: \"{text.Replace("\"", "\\\"", StringComparison.Ordinal)}\"";

            var body = new
            {
                model,
                messages = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = userPrompt }
                },
                max_tokens = 256,
                temperature = 0.2
            };

            using var content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
            using var client = _httpFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(_options.LlmTimeoutSeconds > 0 ? _options.LlmTimeoutSeconds : 15);
            client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", "Bearer " + apiKey);

            using var response = await client.PostAsync(url, content, ct);
            var json = await response.Content.ReadAsStringAsync(ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("NL task LLM returned {Code}. {Body}", (int)response.StatusCode, json.Length > 200 ? json[..200] + "..." : json);
                return null;
            }

            using var doc = JsonDocument.Parse(json);
            var choice = doc.RootElement.GetProperty("choices")[0];
            var contentStr = choice.GetProperty("message").GetProperty("content").GetString()?.Trim();
            if (string.IsNullOrEmpty(contentStr)) return null;

            // Strip markdown code block if present
            var raw = contentStr;
            var match = Regex.Match(contentStr, @"```(?:json)?\s*([\s\S]*?)```");
            if (match.Success)
                raw = match.Groups[1].Value.Trim();

            var parsed = JsonDocument.Parse(raw);
            var r = parsed.RootElement;
            var title = GetStr(r, "title") ?? text;
            if (string.IsNullOrWhiteSpace(title)) title = text;

            var create = new CreateTaskDto
            {
                Title = title.Length > 200 ? title[..200] : title.Trim(),
                Description = NaturalLanguageParseHelper.Truncate(GetStr(r, "description"), 1000),
                DueDate = NaturalLanguageParseHelper.TryParseDue(GetStr(r, "dueDate") ?? GetStr(r, "due_date")),
                Priority = NaturalLanguageParseHelper.ParsePriority(GetInt(r, "priority")),
                Tags = GetStringArray(r, "tags"),
                Notes = NaturalLanguageParseHelper.Truncate(GetStr(r, "notes"), 2000),
                EstimatedTimeMinutes = GetInt(r, "estimatedTimeMinutes") is int estVal && estVal > 0 ? estVal : null,
                RecurrenceType = ParseRecurrenceType(GetInt(r, "recurrenceType") ?? GetInt(r, "recurrence_type")),
                RecurrenceEndDate = NaturalLanguageParseHelper.TryParseDue(GetStr(r, "recurrenceEndDate") ?? GetStr(r, "recurrence_end_date")),
                Status = TaskStatus.Active
            };

            // Merge keyword fallback so any LLM-missed field is filled (ia.md: prefill all fields)
            var fallback = FallbackParse(text);
            if (create.DueDate == null && fallback.DueDate != null) create.DueDate = fallback.DueDate;
            if (create.DueDate != null && fallback.DueDate != null && create.DueDate.Value.Date < DateTime.UtcNow.Date) create.DueDate = fallback.DueDate; // LLM returned past date; use fallback
            if (create.Description == null && fallback.Description != null) create.Description = fallback.Description;
            if (create.Priority == Priority.Medium && fallback.Priority != Priority.Medium) create.Priority = fallback.Priority;
            if (create.Tags.Count == 0 && fallback.Tags.Count > 0) create.Tags = fallback.Tags;
            if (create.Notes == null && fallback.Notes != null) create.Notes = fallback.Notes;
            if (create.EstimatedTimeMinutes == null && fallback.EstimatedTimeMinutes != null) create.EstimatedTimeMinutes = fallback.EstimatedTimeMinutes;
            if (create.RecurrenceType == RecurrenceType.None && fallback.RecurrenceType != RecurrenceType.None) { create.RecurrenceType = fallback.RecurrenceType; create.RecurrenceEndDate = fallback.RecurrenceEndDate; }

            _logger.LogInformation("NL task: LLM parsed \"{Text}\" -> title={Title}, due={Due}", text.Length > 40 ? text[..40] + "..." : text, create.Title, create.DueDate);
            return create;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "NL task LLM parse failed for \"{Text}\".", text.Length > 50 ? text[..50] + "..." : text);
            return null;
        }
    }

    private static string? GetStr(JsonElement r, string key)
    {
        if (r.TryGetProperty(key, out var v)) { var s = v.GetString()?.Trim(); if (!string.IsNullOrEmpty(s)) return s; }
        var snake = string.Concat(key.Select((c, i) => i > 0 && char.IsUpper(c) ? "_" + char.ToLowerInvariant(c) : char.ToLowerInvariant(c).ToString()));
        if (snake != key && r.TryGetProperty(snake, out var v2)) { var s = v2.GetString()?.Trim(); if (!string.IsNullOrEmpty(s)) return s; }
        return null;
    }

    private static int? GetInt(JsonElement r, string key)
    {
        if (r.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.Number && v.TryGetInt32(out var n)) return n;
        var snake = string.Concat(key.Select((c, i) => i > 0 && char.IsUpper(c) ? "_" + char.ToLowerInvariant(c) : char.ToLowerInvariant(c).ToString()));
        if (snake != key && r.TryGetProperty(snake, out var v2) && v2.ValueKind == JsonValueKind.Number && v2.TryGetInt32(out var n2)) return n2;
        return null;
    }

    private static List<string> GetStringArray(JsonElement r, string key)
    {
        if (!r.TryGetProperty(key, out var arr) || arr.ValueKind != JsonValueKind.Array)
            return new List<string>();
        return arr.EnumerateArray()
            .Select(e => e.GetString()?.Trim())
            .Where(s => !string.IsNullOrEmpty(s))
            .Select(s => NaturalLanguageParseHelper.TagToUniform(s!))
            .Take(20)
            .ToList();
    }

    private static RecurrenceType ParseRecurrenceType(int? v)
    {
        if (v is >= 1 and <= 3) return (RecurrenceType)v.Value;
        return RecurrenceType.None;
    }

    private static CreateTaskDto FallbackParse(string text)
    {
        var trimmed = text.Trim();
        if (string.IsNullOrEmpty(trimmed))
            return new CreateTaskDto { Title = "New task", Status = TaskStatus.Active };

        var title = trimmed;
        var description = (string?)null;
        var dueDate = (DateTime?)null;
        var priority = Priority.Medium;
        var tags = new List<string>();
        var lower = trimmed.ToLowerInvariant();

        // Priority: set from phrases (include "high prio" / "low prio"), then strip from title
        if (lower.Contains("high priority") || lower.Contains("high prio") || lower.Contains(" urgent") || lower == "high")
            priority = Priority.High;
        else if (lower.Contains("low priority") || lower.Contains("low prio") || lower.Contains(" low") || lower == "low")
            priority = Priority.Low;

        // Time of day: morning=8, afternoon=14, evening=18; or "at 3pm", "at 10am"
        var dueTimeHours = (int?)null;
        var dueTimeMinutes = 0;
        if (lower.Contains("morning")) { dueTimeHours = 8; }
        else if (lower.Contains("afternoon")) { dueTimeHours = 14; }
        else if (lower.Contains("evening")) { dueTimeHours = 18; }
        var atTimeMatch = Regex.Match(trimmed, @"\b(at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?|\d{1,2}(?::\d{2})?\s*(?:am|pm))\b", RegexOptions.IgnoreCase);
        if (atTimeMatch.Success && NaturalLanguageParseHelper.ParseAtTime(atTimeMatch.Value, out var h, out var m)) { dueTimeHours = h; dueTimeMinutes = m; }

        // Due: extract and strip from title
        var byMatch = Regex.Match(trimmed, @"\b(?:by|due)\s+(\w+(?:\s+\d{1,2})?(?:\s+\d{4})?)\b", RegexOptions.IgnoreCase);
        if (byMatch.Success)
        {
            var dueStr = byMatch.Groups[1].Value.Trim();
            dueDate = NaturalLanguageParseHelper.ParseRelativeDate(dueStr) ?? NaturalLanguageParseHelper.TryParseExactDate(dueStr);
            if (dueDate.HasValue)
            {
                if (dueTimeHours.HasValue) dueDate = dueDate.Value.Date.AddHours(dueTimeHours.Value).AddMinutes(dueTimeMinutes);
                title = Regex.Replace(title, @"\s*(?:by|due)\s+" + Regex.Escape(byMatch.Groups[1].Value), "", RegexOptions.IgnoreCase).Trim();
            }
        }
        if (!dueDate.HasValue && lower.Contains("tomorrow"))
        {
            var tomorrow = DateTime.UtcNow.Date.AddDays(1);
            dueDate = dueTimeHours.HasValue ? tomorrow.AddHours(dueTimeHours.Value).AddMinutes(dueTimeMinutes) : tomorrow;
            title = Regex.Replace(title, @"\s*tomorrow\s*", " ", RegexOptions.IgnoreCase).Trim();
        }
        if (!dueDate.HasValue && lower.Contains("next week"))
        {
            var nextMon = DateTime.UtcNow.Date;
            while (nextMon.DayOfWeek != DayOfWeek.Monday) nextMon = nextMon.AddDays(1);
            dueDate = dueTimeHours.HasValue ? nextMon.AddHours(dueTimeHours.Value).AddMinutes(dueTimeMinutes) : nextMon;
            title = Regex.Replace(title, @"\s*next week\s*", " ", RegexOptions.IgnoreCase).Trim();
        }

        // Strip "at 3pm" / "at 10am" from title (exact phrase we parsed)
        if (atTimeMatch.Success)
            title = Regex.Replace(title, Regex.Escape(atTimeMatch.Value), "", RegexOptions.IgnoreCase).Trim();

        // Strip time-of-day and priority phrases from title so title = task name only
        title = Regex.Replace(title, @"\s*morning\s*", " ", RegexOptions.IgnoreCase).Trim();
        title = Regex.Replace(title, @"\s*afternoon\s*", " ", RegexOptions.IgnoreCase).Trim();
        title = Regex.Replace(title, @"\s*evening\s*", " ", RegexOptions.IgnoreCase).Trim();
        title = Regex.Replace(title, @"\s*high\s+priority\s*", " ", RegexOptions.IgnoreCase).Trim();
        title = Regex.Replace(title, @"\s*high\s+prio\s*", " ", RegexOptions.IgnoreCase).Trim();
        title = Regex.Replace(title, @"\s*low\s+priority\s*", " ", RegexOptions.IgnoreCase).Trim();
        title = Regex.Replace(title, @"\s*low\s+prio\s*", " ", RegexOptions.IgnoreCase).Trim();
        title = Regex.Replace(title, @"\s*urgent\s*", " ", RegexOptions.IgnoreCase).Trim();
        title = Regex.Replace(title, @"\s+", " ").Trim();
        if (string.IsNullOrWhiteSpace(title)) title = "New task";
        if (title.Length > 200) { description = title[200..]; title = title[..200]; }
        if (dueTimeHours.HasValue && string.IsNullOrEmpty(description))
            description = dueTimeHours.Value switch { 8 => "Morning", 14 => "Afternoon", 18 => "Evening", _ => null };

        // Title: capitalize first letter for consistency with description (e.g. "Jog", "Review report")
        title = NaturalLanguageParseHelper.ToTitleCaseFirst(title);

        // Derive tags from title when none (e.g. "Review report" -> ["report"])
        if (tags.Count == 0 && !string.IsNullOrWhiteSpace(title))
        {
            var stop = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "the", "and", "for", "by", "to", "in", "on", "at", "a", "an" };
            foreach (var word in title.Split((char[]?)[' ', '\t'], StringSplitOptions.RemoveEmptyEntries))
            {
                var w = word.Trim();
                if (w.Length >= 2 && !stop.Contains(w) && !tags.Any(t => string.Equals(t, w, StringComparison.OrdinalIgnoreCase)))
                    tags.Add(NaturalLanguageParseHelper.TagToUniform(w));
                if (tags.Count >= 5) break;
            }
        }

        return new CreateTaskDto
        {
            Title = title,
            Description = description,
            DueDate = dueDate,
            Priority = priority,
            Tags = tags,
            Status = TaskStatus.Active
        };
    }
}
