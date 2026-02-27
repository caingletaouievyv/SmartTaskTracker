using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SmartTaskTracker.API.Data;
using SmartTaskTracker.API.DTOs;
using SmartTaskTracker.API.Helpers;
using SmartTaskTracker.API.Models;
using TaskModel = SmartTaskTracker.API.Models.Task;
using TaskStatus = SmartTaskTracker.API.Models.TaskStatus;
using SysTask = System.Threading.Tasks.Task;

namespace SmartTaskTracker.API.Services;

public class TaskMemoryService
{
    private const string DefaultHfBase = "https://router.huggingface.co/hf-inference";
    private const int NotesTruncateForEmbedding = 100;
    private static SemaphoreSlim? _embeddingSemaphore;
    private static readonly object _semaphoreLock = new();
    private readonly AppDbContext _context;
    private readonly TaskService _taskService;
    private readonly TaskMemoryOptions _options;
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<TaskMemoryService> _logger;
    private readonly LRUCache<int, float[]> _embeddingCache;

    public TaskMemoryService(
        AppDbContext context,
        TaskService taskService,
        IOptions<TaskMemoryOptions> options,
        IHttpClientFactory httpFactory,
        ILogger<TaskMemoryService> logger)
    {
        _context = context;
        _taskService = taskService;
        _options = options.Value;
        _httpFactory = httpFactory;
        _logger = logger;
        _embeddingCache = new LRUCache<int, float[]>(_options.CacheSize);
    }

    private string? GetApiKey() =>
        Environment.GetEnvironmentVariable("TASKMEMORY_API_KEY")
        ?? Environment.GetEnvironmentVariable("HF_TOKEN")
        ?? _options.ApiKey;

    private static double CosineSimilarity(ReadOnlySpan<float> a, ReadOnlySpan<float> b)
    {
        if (a.Length == 0 || a.Length != b.Length) return 0;
        double dot = 0, normA = 0, normB = 0;
        for (var i = 0; i < a.Length; i++)
        {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        var denom = Math.Sqrt(normA) * Math.Sqrt(normB);
        return denom > 0 ? dot / denom : 0;
    }

    private SemaphoreSlim GetEmbeddingSemaphore()
    {
        if (_embeddingSemaphore != null) return _embeddingSemaphore;
        lock (_semaphoreLock)
        {
            _embeddingSemaphore ??= new SemaphoreSlim(_options.MaxConcurrentEmbeddings > 0 ? _options.MaxConcurrentEmbeddings : 3);
            return _embeddingSemaphore;
        }
    }

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max];

    private static string PriorityLabel(Priority p) =>
        p switch { Priority.High => "High priority", Priority.Medium => "Medium priority", _ => "Low priority" };

    /// <summary>Build text for embedding: title + description + priority label + tag names + optional truncated notes (first 100 chars).</summary>
    private static string BuildEmbeddingText(string title, string? description, Priority priority, string tagNames, string? notes)
    {
        var parts = new List<string> { title.Trim(), description?.Trim() ?? "", PriorityLabel(priority) };
        if (!string.IsNullOrWhiteSpace(tagNames)) parts.Add("Tags: " + tagNames.Trim());
        if (!string.IsNullOrWhiteSpace(notes)) parts.Add(Truncate(notes.Trim(), NotesTruncateForEmbedding));
        return string.Join(" ", parts.Where(s => !string.IsNullOrEmpty(s))).Trim();
    }

    private static string BuildEmbeddingTextTitleAndDescriptionOnly(string? title, string? description) =>
        string.Join(" ", new[] { title?.Trim() ?? "", description?.Trim() ?? "" }.Where(s => !string.IsNullOrWhiteSpace(s))).Trim();

    private static bool ShareAnyMeaningfulWord(string textA, string textB)
    {
        if (string.IsNullOrWhiteSpace(textA) || string.IsNullOrWhiteSpace(textB)) return false;
        var stop = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            { "the", "and", "for", "by", "to", "in", "on", "at", "a", "an", "or", "is", "it", "as", "be" };
        var weekendTerms = new[] { "weekend", "saturday", "sunday", "week" };
        var wordsA = NormalizeWordsForOverlap(ExtractWords(textA), stop, weekendTerms);
        var wordsB = NormalizeWordsForOverlap(ExtractWords(textB), stop, weekendTerms);
        return wordsA.Overlaps(wordsB);
    }

    private static HashSet<string> NormalizeWordsForOverlap(IEnumerable<string> words, HashSet<string> stop, string[] weekendTerms)
    {
        var set = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var w in words.Where(w => w.Length >= 2 && !stop.Contains(w)))
        {
            set.Add(w);
            if (weekendTerms.Contains(w, StringComparer.OrdinalIgnoreCase)) set.Add("_week"); // so weekend/saturday/sunday overlap
        }
        return set;
    }

    private static IEnumerable<string> ExtractWords(string text)
    {
        return text.Split((char[]?)[' ', '\t', ',', '.', ':', ';', '!', '?', '"', '\'', '(', ')'], StringSplitOptions.RemoveEmptyEntries)
            .Select(s => s.Trim().ToLowerInvariant())
            .Where(s => s.Length > 0);
    }

    public async Task<float[]?> GetEmbeddingAsync(string text, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text)) return null;
        var key = GetApiKey();
        if (string.IsNullOrEmpty(key) || !_options.EmbeddingProvider.Equals("HuggingFace", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrEmpty(key))
                _logger.LogWarning("TaskMemory: no ApiKey (set TaskMemory:ApiKey or TASKMEMORY_API_KEY / HF_TOKEN).");
            return null;
        }

        var input = Truncate(text.Trim(), _options.MaxTextLength > 0 ? _options.MaxTextLength : 1000);
        await GetEmbeddingSemaphore().WaitAsync(ct);
        try
        {
            var client = _httpFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(_options.EmbeddingTimeoutSeconds > 0 ? _options.EmbeddingTimeoutSeconds : 30);
            client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", "Bearer " + key);
            var baseUrl = string.IsNullOrWhiteSpace(_options.EmbeddingBaseUrl) ? DefaultHfBase : _options.EmbeddingBaseUrl.Trim().TrimEnd('/');
            var url = $"{baseUrl}/models/{_options.EmbeddingModel.Trim()}/pipeline/feature-extraction";
            var body = JsonSerializer.Serialize(new { inputs = input });
            using var content = new StringContent(body, Encoding.UTF8, "application/json");

            using var response = await client.PostAsync(url, content, ct);
            var json = await response.Content.ReadAsStringAsync(ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Embedding API returned {StatusCode} for model {Model}. Body: {Body}",
                    (int)response.StatusCode, _options.EmbeddingModel, json.Length > 200 ? json[..200] + "..." : json);
                return null;
            }
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Array) { _logger.LogWarning("Embedding API: response not an array. Body: {Body}", json.Length > 150 ? json[..150] + "..." : json); return null; }
            if (root.GetArrayLength() == 0) { _logger.LogWarning("Embedding API: empty array."); return null; }
            var first = root[0];
            var arr = first.ValueKind == JsonValueKind.Array ? first : root;
            var len = arr.GetArrayLength();
            var vec = new float[len];
            for (var i = 0; i < len; i++)
                vec[i] = (float)arr[i].GetDouble();
            return vec;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Embedding API failed for model {Model}", _options.EmbeddingModel);
            return null;
        }
        finally
        {
            GetEmbeddingSemaphore().Release();
        }
    }

    private const int EmbeddingBatchChunkSize = 8;

    /// <summary>Batch embed texts (chunked) to avoid rate limit and API limits. Returns null for failed/empty.</summary>
    private async Task<List<float[]?>> GetEmbeddingsBatchAsync(IReadOnlyList<string> texts, CancellationToken ct = default)
    {
        if (texts == null || texts.Count == 0) return new List<float[]?>();
        var key = GetApiKey();
        if (string.IsNullOrEmpty(key) || !_options.EmbeddingProvider.Equals("HuggingFace", StringComparison.OrdinalIgnoreCase)) return texts.Select(_ => (float[]?)null).ToList();

        var maxLen = _options.MaxTextLength > 0 ? _options.MaxTextLength : 1000;
        var inputs = texts.Select(t => Truncate((t ?? "").Trim(), maxLen)).Where(s => !string.IsNullOrEmpty(s)).ToList();
        if (inputs.Count == 0) return texts.Select(_ => (float[]?)null).ToList();

        var allResults = new List<float[]?>();
        for (var offset = 0; offset < inputs.Count; offset += EmbeddingBatchChunkSize)
        {
            var chunk = inputs.Skip(offset).Take(EmbeddingBatchChunkSize).ToList();
            var chunkResults = await GetEmbeddingsBatchChunkAsync(chunk, key!, ct);
            allResults.AddRange(chunkResults);
        }
        return allResults;
    }

    private async Task<List<float[]?>> GetEmbeddingsBatchChunkAsync(List<string> inputs, string key, CancellationToken ct)
    {
        await GetEmbeddingSemaphore().WaitAsync(ct);
        try
        {
            var client = _httpFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(_options.EmbeddingTimeoutSeconds > 0 ? _options.EmbeddingTimeoutSeconds : 30);
            client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", "Bearer " + key);
            var baseUrl = string.IsNullOrWhiteSpace(_options.EmbeddingBaseUrl) ? DefaultHfBase : _options.EmbeddingBaseUrl.Trim().TrimEnd('/');
            var url = $"{baseUrl}/models/{_options.EmbeddingModel.Trim()}/pipeline/feature-extraction";
            var body = JsonSerializer.Serialize(new { inputs });
            using var content = new StringContent(body, Encoding.UTF8, "application/json");
            using var response = await client.PostAsync(url, content, ct);
            var json = await response.Content.ReadAsStringAsync(ct);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Embedding batch returned {StatusCode}. Body: {Body}", (int)response.StatusCode, json.Length > 150 ? json[..150] + "..." : json);
                return inputs.Select(_ => (float[]?)null).ToList();
            }
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Array) return inputs.Select(_ => (float[]?)null).ToList();
            var results = new List<float[]?>();
            for (var i = 0; i < root.GetArrayLength(); i++)
            {
                var inner = root[i];
                if (inner.ValueKind != JsonValueKind.Array || inner.GetArrayLength() == 0) { results.Add(null); continue; }
                var len = inner.GetArrayLength();
                var vec = new float[len];
                for (var j = 0; j < len; j++) vec[j] = (float)inner[j].GetDouble();
                results.Add(vec);
            }
            return results;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Embedding batch failed for model {Model}", _options.EmbeddingModel);
            return inputs.Select(_ => (float[]?)null).ToList();
        }
        finally
        {
            GetEmbeddingSemaphore().Release();
        }
    }

    private static float[]? ParseEmbeddingJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            var arr = JsonSerializer.Deserialize<float[]>(json);
            return arr is { Length: > 0 } ? arr : null;
        }
        catch { return null; }
    }

    private async Task<Dictionary<int, float[]>> TryLoadTaskEmbeddingsFromDbAsync(int userId, IEnumerable<int> taskIds, CancellationToken ct)
    {
        var idSet = taskIds.ToHashSet();
        if (idSet.Count == 0) return new Dictionary<int, float[]>();
        var rows = await _context.TaskEmbeddings
            .AsNoTracking()
            .Where(te => te.UserId == userId)
            .ToListAsync(ct);
        var result = new Dictionary<int, float[]>();
        foreach (var row in rows)
        {
            if (!idSet.Contains(row.TaskId)) continue;
            var vec = ParseEmbeddingJson(row.EmbeddingJson);
            if (vec != null) result[row.TaskId] = vec;
        }
        return result;
    }

    private async SysTask SaveTaskEmbeddingToDbAsync(int userId, int taskId, float[] embedding, CancellationToken ct)
    {
        var json = JsonSerializer.Serialize(embedding);
        var existing = await _context.TaskEmbeddings.FirstOrDefaultAsync(te => te.TaskId == taskId && te.UserId == userId, ct);
        if (existing != null)
        {
            existing.EmbeddingJson = json;
        }
        else
        {
            _context.TaskEmbeddings.Add(new TaskEmbedding { TaskId = taskId, UserId = userId, EmbeddingJson = json });
        }
        await _context.SaveChangesAsync(ct);
    }

    /// <summary>Remove task embedding from memory and DB so it is recomputed on next use (e.g. after task update).</summary>
    public async SysTask InvalidateTaskEmbeddingAsync(int userId, int taskId, CancellationToken ct = default)
    {
        _embeddingCache.Remove(taskId);
        var row = await _context.TaskEmbeddings.FirstOrDefaultAsync(te => te.TaskId == taskId && te.UserId == userId, ct);
        if (row != null)
        {
            _context.TaskEmbeddings.Remove(row);
            await _context.SaveChangesAsync(ct);
        }
    }

    public async Task<List<TaskSearchResultDto>> SearchSemanticAsync(
        int userId,
        string query,
        int? topK = null,
        double? threshold = null,
        CancellationToken ct = default)
    {
        var k = topK ?? _options.DefaultTopK;
        var thresh = threshold ?? _options.DefaultThreshold;
        var tasks = await _context.Tasks
            .AsNoTracking()
            .Where(t => t.UserId == userId && !t.ParentTaskId.HasValue && !t.IsArchived)
            .Select(t => new { t.Id, t.Title, t.Description, t.Priority, t.Notes })
            .ToListAsync(ct);
        if (tasks.Count == 0) return new List<TaskSearchResultDto>();

        var taskIds = tasks.Select(t => t.Id).ToList();
        var tagNamesByTaskId = await _context.TaskTags
            .AsNoTracking()
            .Where(tt => taskIds.Contains(tt.TaskId))
            .Select(tt => new { tt.TaskId, tt.Tag.Name })
            .ToListAsync(ct);
        var tagNamesLookup = tagNamesByTaskId
            .GroupBy(x => x.TaskId)
            .ToDictionary(g => g.Key, g => string.Join(", ", g.Select(x => x.Name)));

        var taskItems = tasks
            .Select(t =>
            {
                var tagNames = tagNamesLookup.TryGetValue(t.Id, out var names) ? names : "";
                var text = BuildEmbeddingText(t.Title, t.Description, t.Priority, tagNames, t.Notes);
                return (t.Id, Text: text);
            })
            .Where(x => !string.IsNullOrEmpty(x.Text))
            .ToList();
        var queryVec = await GetEmbeddingAsync(query, ct);
        if (queryVec == null)
        {
            _logger.LogWarning("Semantic search: query embedding failed for \"{Query}\".", Truncate(query, 50));
            return new List<TaskSearchResultDto>();
        }

        var missingIds = taskItems.Where(x => _embeddingCache.Get(x.Id) == null).Select(x => x.Id).ToList();
        if (missingIds.Count > 0)
        {
            var dbLoaded = await TryLoadTaskEmbeddingsFromDbAsync(userId, missingIds, ct);
            foreach (var (id, vec) in dbLoaded) _embeddingCache.Set(id, vec);
            var stillMissing = taskItems.Where(x => _embeddingCache.Get(x.Id) == null).ToList();
            if (stillMissing.Count > 0)
            {
                var batchVecs = await GetEmbeddingsBatchAsync(stillMissing.Select(x => x.Text).ToList(), ct);
                for (var i = 0; i < stillMissing.Count && i < batchVecs.Count; i++)
                {
                    if (batchVecs[i] != null)
                    {
                        _embeddingCache.Set(stillMissing[i].Id, batchVecs[i]!);
                        await SaveTaskEmbeddingToDbAsync(userId, stillMissing[i].Id, batchVecs[i]!, ct);
                    }
                }
            }
        }

        var allScores = new List<(int TaskId, double Score)>();
        foreach (var (id, _) in taskItems)
        {
            var taskVec = _embeddingCache.Get(id);
            if (taskVec == null) continue;
            var score = CosineSimilarity(queryVec, taskVec);
            allScores.Add((id, score));
        }
        var scores = allScores.Where(x => x.Score >= thresh).ToList();
        if (scores.Count == 0 && allScores.Count > 0)
        {
            var top = allScores.OrderByDescending(x => x.Score).Take(3).Select(x => x.Score.ToString("F3")).ToList();
            _logger.LogWarning("Semantic: 0 above threshold {Thresh}. Top raw scores: [{Scores}] (query ok, {N} tasks).", thresh, string.Join(", ", top), taskItems.Count);
        }
        else if (scores.Count == 0)
            _logger.LogWarning("Semantic: 0 tasks above threshold {Thresh} (query ok, {TaskCount} tasks).", thresh, taskItems.Count);

        var ordered = scores.OrderByDescending(x => x.Score).Take(k).ToList();
        var results = new List<TaskSearchResultDto>();
        foreach (var (taskId, score) in ordered)
        {
            var dto = await _taskService.GetTaskByIdAsync(taskId, userId);
            if (dto != null)
                results.Add(new TaskSearchResultDto { Task = dto, Score = score });
        }
        return results;
    }

    private const int SuggestTagsSimilarTaskCount = 15;

    public async Task<List<TagSuggestionDto>> SuggestTagsAsync(
        int userId,
        string text,
        int topK = 5,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text)) return new List<TagSuggestionDto>();
        var trimmed = text.Trim();
        var thresh = _options.DefaultThreshold;
        var tasks = await _context.Tasks
            .AsNoTracking()
            .Where(t => t.UserId == userId && !t.ParentTaskId.HasValue && !t.IsArchived)
            .Select(t => new { t.Id, t.Title, t.Description, t.Priority, t.Notes })
            .ToListAsync(ct);
        if (tasks.Count == 0) return new List<TagSuggestionDto>();

        var taskIds = tasks.Select(t => t.Id).ToList();
        var tagData = await _context.TaskTags
            .AsNoTracking()
            .Where(tt => taskIds.Contains(tt.TaskId))
            .Select(tt => new { tt.TaskId, tt.Tag.Name, tt.Tag.Color })
            .ToListAsync(ct);
        var tagNamesByTaskId = tagData.GroupBy(x => x.TaskId).ToDictionary(g => g.Key, g => string.Join(", ", g.Select(x => x.Name)));
        var tagColors = tagData.GroupBy(x => x.Name).ToDictionary(g => g.Key, g => g.First().Color);

        var taskItems = tasks
            .Select(t =>
            {
                var tagNames = tagNamesByTaskId.TryGetValue(t.Id, out var names) ? names : "";
                var textForEmbed = BuildEmbeddingText(t.Title, t.Description, t.Priority, tagNames, t.Notes);
                return (t.Id, Text: textForEmbed);
            })
            .Where(x => !string.IsNullOrEmpty(x.Text))
            .ToList();

        var missingIds = taskItems.Where(x => _embeddingCache.Get(x.Id) == null).Select(x => x.Id).ToList();
        if (missingIds.Count > 0)
        {
            var dbLoaded = await TryLoadTaskEmbeddingsFromDbAsync(userId, missingIds, ct);
            foreach (var (id, vec) in dbLoaded) _embeddingCache.Set(id, vec);
            var stillMissing = taskItems.Where(x => _embeddingCache.Get(x.Id) == null).ToList();
            if (stillMissing.Count > 0)
            {
                var batchVecs = await GetEmbeddingsBatchAsync(stillMissing.Select(x => x.Text).ToList(), ct);
                for (var i = 0; i < stillMissing.Count && i < batchVecs.Count; i++)
                {
                    if (batchVecs[i] != null)
                    {
                        _embeddingCache.Set(stillMissing[i].Id, batchVecs[i]!);
                        await SaveTaskEmbeddingToDbAsync(userId, stillMissing[i].Id, batchVecs[i]!, ct);
                    }
                }
            }
        }

        var queryStrings = new List<string> { trimmed };
        var words = trimmed.Split((char[]?)[' ', '\t'], StringSplitOptions.RemoveEmptyEntries)
            .Select(w => w.Trim())
            .Where(w => w.Length >= 2)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Where(w => !queryStrings[0].Equals(w, StringComparison.OrdinalIgnoreCase))
            .ToList();
        queryStrings.AddRange(words);

        foreach (var queryText in queryStrings)
        {
            var queryVec = await GetEmbeddingAsync(queryText, ct);
            if (queryVec == null) continue;

            var scores = new List<(int TaskId, double Score)>();
            foreach (var (id, _) in taskItems)
            {
                var vec = _embeddingCache.Get(id);
                if (vec == null) continue;
                var score = CosineSimilarity(queryVec, vec);
                if (score >= thresh) scores.Add((id, score));
            }
            var topTasks = scores.OrderByDescending(x => x.Score).Take(SuggestTagsSimilarTaskCount).Select(x => x.TaskId).ToHashSet();
            if (topTasks.Count == 0) continue;

            var tagCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            foreach (var tt in tagData.Where(x => topTasks.Contains(x.TaskId)))
            {
                tagCounts.TryGetValue(tt.Name, out var c);
                tagCounts[tt.Name] = c + 1;
            }
            var ordered = tagCounts.OrderByDescending(x => x.Value).Take(topK).Select(x => new TagSuggestionDto
            {
                Name = x.Key,
                Color = tagColors.TryGetValue(x.Key, out var color) ? color : null
            }).ToList();
            if (ordered.Count > 0) return ordered;
        }

        return new List<TagSuggestionDto>();
    }

    private const int SuggestDepsSimilarTaskCount = 15;

    public async Task<List<TaskDependencySuggestionDto>> SuggestDependenciesAsync(
        int userId,
        int taskId,
        int topK = 5,
        CancellationToken ct = default)
    {
        var task = await _taskService.GetTaskByIdAsync(taskId, userId);
        if (task == null) return new List<TaskDependencySuggestionDto>();

        var text = BuildEmbeddingTextTitleAndDescriptionOnly(task.Title, task.Description ?? "");
        if (string.IsNullOrWhiteSpace(text)) return new List<TaskDependencySuggestionDto>();

        var thresh = _options.DefaultThreshold;
        var tasks = await _context.Tasks
            .AsNoTracking()
            .Where(t => t.UserId == userId && !t.ParentTaskId.HasValue && !t.IsArchived && t.Id != taskId)
            .Select(t => new { t.Id, t.Title, t.Description, t.Priority, t.Notes })
            .ToListAsync(ct);
        if (tasks.Count == 0) return new List<TaskDependencySuggestionDto>();

        var taskIds = tasks.Select(t => t.Id).ToList();
        var tagData = await _context.TaskTags
            .AsNoTracking()
            .Where(tt => taskIds.Contains(tt.TaskId))
            .Select(tt => new { tt.TaskId, tt.Tag.Name })
            .ToListAsync(ct);
        var tagNamesByTaskId = tagData.GroupBy(x => x.TaskId).ToDictionary(g => g.Key, g => string.Join(", ", g.Select(x => x.Name)));

        var taskItems = tasks
            .Select(t =>
            {
                var tagStr = tagNamesByTaskId.TryGetValue(t.Id, out var n) ? n : "";
                var textForEmbed = BuildEmbeddingText(t.Title, t.Description, t.Priority, tagStr, t.Notes);
                return (t.Id, Text: textForEmbed);
            })
            .Where(x => !string.IsNullOrEmpty(x.Text))
            .ToList();

        var queryVec = await GetEmbeddingAsync(text, ct);
        if (queryVec == null) return new List<TaskDependencySuggestionDto>();

        var missingIds = taskItems.Where(x => _embeddingCache.Get(x.Id) == null).Select(x => x.Id).ToList();
        if (missingIds.Count > 0)
        {
            var dbLoaded = await TryLoadTaskEmbeddingsFromDbAsync(userId, missingIds, ct);
            foreach (var (id, vec) in dbLoaded) _embeddingCache.Set(id, vec);
            var stillMissing = taskItems.Where(x => _embeddingCache.Get(x.Id) == null).ToList();
            if (stillMissing.Count > 0)
            {
                var batchVecs = await GetEmbeddingsBatchAsync(stillMissing.Select(x => x.Text).ToList(), ct);
                for (var i = 0; i < stillMissing.Count && i < batchVecs.Count; i++)
                {
                    if (batchVecs[i] != null)
                    {
                        _embeddingCache.Set(stillMissing[i].Id, batchVecs[i]!);
                        await SaveTaskEmbeddingToDbAsync(userId, stillMissing[i].Id, batchVecs[i]!, ct);
                    }
                }
            }
        }

        var scores = new List<(int TaskId, double Score)>();
        foreach (var (id, candidateText) in taskItems)
        {
            var vec = _embeddingCache.Get(id);
            if (vec == null) continue;
            var score = CosineSimilarity(queryVec, vec);
            if (ShareAnyMeaningfulWord(text, candidateText)) score += 0.15;
            if (score >= thresh) scores.Add((id, score));
        }
        var topTaskIds = scores.OrderByDescending(x => x.Score).Take(SuggestDepsSimilarTaskCount).Select(x => x.TaskId).ToHashSet();
        var depCounts = new Dictionary<int, int>();
        var deps = await _context.TaskDependencies
            .AsNoTracking()
            .Where(d => topTaskIds.Contains(d.TaskId))
            .Select(d => d.DependsOnTaskId)
            .ToListAsync(ct);
        var existingDepIds = (task.DependsOnTaskIds ?? new List<int>()).ToHashSet();
        foreach (var depId in deps)
        {
            if (depId == taskId || existingDepIds.Contains(depId)) continue;
            depCounts.TryGetValue(depId, out var c);
            depCounts[depId] = c + 1;
        }
        var suggestedIdsFromPattern = depCounts.OrderByDescending(x => x.Value).Select(x => x.Key).Take(topK).ToList();
        var similarOrdered = scores
            .OrderByDescending(x => x.Score)
            .Select(x => x.TaskId)
            .Where(id => id != taskId && !existingDepIds.Contains(id))
            .ToList();

        var suggestedIds = new List<int>();
        foreach (var id in suggestedIdsFromPattern)
            if (!suggestedIds.Contains(id)) suggestedIds.Add(id);
        foreach (var id in similarOrdered)
            if (suggestedIds.Count >= topK) break;
            else if (!suggestedIds.Contains(id)) suggestedIds.Add(id);

        if (suggestedIds.Count == 0) return new List<TaskDependencySuggestionDto>();

        var suggested = await _context.Tasks
            .AsNoTracking()
            .Where(t => suggestedIds.Contains(t.Id) && t.UserId == userId)
            .Select(t => new TaskDependencySuggestionDto { Id = t.Id, Title = t.Title })
            .ToListAsync(ct);
        return suggested.OrderBy(t => suggestedIds.IndexOf(t.Id)).ToList();
    }

    public async Task<(bool Ok, string Reason)> GetEmbeddingDiagnosticAsync(CancellationToken ct = default)
    {
        var key = GetApiKey();
        if (string.IsNullOrEmpty(key)) return (false, "No ApiKey (set TaskMemory:ApiKey or TASKMEMORY_API_KEY / HF_TOKEN)");
        if (!_options.EmbeddingProvider.Equals("HuggingFace", StringComparison.OrdinalIgnoreCase)) return (false, "EmbeddingProvider is not HuggingFace");

        await GetEmbeddingSemaphore().WaitAsync(ct);
        try
        {
            var client = _httpFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(_options.EmbeddingTimeoutSeconds > 0 ? _options.EmbeddingTimeoutSeconds : 30);
            client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", "Bearer " + key);
            var baseUrl = string.IsNullOrWhiteSpace(_options.EmbeddingBaseUrl) ? DefaultHfBase : _options.EmbeddingBaseUrl.Trim().TrimEnd('/');
            var url = $"{baseUrl}/models/{_options.EmbeddingModel.Trim()}/pipeline/feature-extraction";
            var body = JsonSerializer.Serialize(new { inputs = "test" });
            using var content = new StringContent(body, Encoding.UTF8, "application/json");
            using var response = await client.PostAsync(url, content, ct);
            var json = await response.Content.ReadAsStringAsync(ct);
            if (!response.IsSuccessStatusCode)
                return (false, $"HTTP {(int)response.StatusCode}: {(json.Length > 100 ? json[..100] + "..." : json)}");
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Array || root.GetArrayLength() == 0)
                return (false, "Response not array or empty");
            var first = root[0];
            var arr = first.ValueKind == JsonValueKind.Array ? first : root;
            if (arr.GetArrayLength() == 0) return (false, "Empty embedding array");
            return (true, "OK");
        }
        catch (Exception ex)
        {
            return (false, ex.Message);
        }
        finally
        {
            GetEmbeddingSemaphore().Release();
        }
    }
}
