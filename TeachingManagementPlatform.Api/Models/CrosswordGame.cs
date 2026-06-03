namespace TeachingManagementPlatform.Api.Models;

public class CrosswordGame
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = "draft"; // "draft" | "published" | "archived"
    public string Slug { get; set; } = string.Empty; // unique
    public string ConfigJson { get; set; } = string.Empty;
    public string GridJson { get; set; } = string.Empty;
    public int EcoinsSpent { get; set; }
    public string? SourceDocumentContent { get; set; }
    public DateTime? SourceDocumentExpiresAt { get; set; }
    public DateTime? Deadline { get; set; }
    public bool ShowAnswerAfterExpiry { get; set; }
    public int? MaxAttempts { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
    public ICollection<CrosswordWord> Words { get; set; } = new List<CrosswordWord>();
}
