namespace SmartTaskTracker.API.Helpers;

public class TaskMemoryOptions
{
    public const string SectionName = "TaskMemory";

    public string EmbeddingProvider { get; set; } = "HuggingFace";
    public string EmbeddingModel { get; set; } = "sentence-transformers/all-MiniLM-L6-v2";
    /// <summary>Optional. Base URL for HF (default: router). Override only if endpoint changes.</summary>
    public string? EmbeddingBaseUrl { get; set; }
    /// <summary>Min cosine similarity for semantic results (default 0.25 for recall; raise for precision).</summary>
    public double DefaultThreshold { get; set; } = 0.25;
    public int DefaultTopK { get; set; } = 10;
    public int CacheSize { get; set; } = 500;
    public string? ApiKey { get; set; }
    public int MaxTextLength { get; set; } = 1000;
    public int EmbeddingTimeoutSeconds { get; set; } = 30;
    public int MaxConcurrentEmbeddings { get; set; } = 3;
}
