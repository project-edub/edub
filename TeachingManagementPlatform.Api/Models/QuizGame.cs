namespace TeachingManagementPlatform.Api.Models;

public class QuizGame
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = "draft"; // "draft" | "published" | "archived"
    public string Slug { get; set; } = string.Empty;
    public string ConfigJson { get; set; } = string.Empty;
    public int EcoinsSpent { get; set; }
    public string? SourceDocumentContent { get; set; }
    public DateTime? SourceDocumentExpiresAt { get; set; }
    public bool ShowAnswersAfterSubmit { get; set; } = true; // true = show correct answers, false = only show score
    public bool RequireStudentName { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
    public ICollection<QuizGameQuestion> Questions { get; set; } = new List<QuizGameQuestion>();
    public ICollection<QuizSubmission> Submissions { get; set; } = new List<QuizSubmission>();
}
