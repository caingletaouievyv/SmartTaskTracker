namespace SmartTaskTracker.API.Models;

/// <summary>Persisted task embedding for semantic search, smart tagging, dependency suggestions. Invalidated when task is updated or deleted.</summary>
public class TaskEmbedding
{
    public int TaskId { get; set; }
    public int UserId { get; set; }
    public string EmbeddingJson { get; set; } = "";
}
