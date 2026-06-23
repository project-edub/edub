namespace TeachingManagementPlatform.Api.Models;

/// <summary>
/// Stores pre-computed embedding vector for a StorageItem (file) for AI-based similarity matching.
/// Embedding is stored as a JSON array of floats (nvarchar(max)).
/// </summary>
public class StorageItemEmbedding
{
    public int Id { get; set; }
    public int StorageItemId { get; set; }

    /// <summary>
    /// The embedding vector serialized as a JSON array of floats, e.g. [0.123, -0.456, ...]
    /// </summary>
    public string Embedding { get; set; } = string.Empty;

    /// <summary>
    /// When this embedding was computed (used for staleness checks).
    /// </summary>
    public DateTime ComputedAt { get; set; }

    // Navigation properties
    public StorageItem StorageItem { get; set; } = null!;
}
