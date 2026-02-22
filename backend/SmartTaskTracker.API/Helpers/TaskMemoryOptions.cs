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

    /// <summary>Natural language task: provider (openai | deepseek). Override with env MODEL_PROVIDER.</summary>
    public string LlmProvider { get; set; } = "openai";
    /// <summary>LLM model (e.g. gpt-4o-mini, deepseek-chat). Default per provider if not set.</summary>
    public string? LlmModel { get; set; }
    /// <summary>Override base URL (e.g. for OpenRouter). When set, LlmProvider is ignored.</summary>
    public string? LlmBaseUrl { get; set; }
    public string? LlmApiKey { get; set; }
    public int LlmTimeoutSeconds { get; set; } = 15;
}
