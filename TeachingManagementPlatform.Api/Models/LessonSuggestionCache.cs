namespace TeachingManagementPlatform.Api.Models;

public class LessonSuggestionCache
{
    public int Id { get; set; }
    public int LessonId { get; set; }
    public string LessonNameHash { get; set; } = string.Empty;
    public string? SuggestedAttachments { get; set; }
    public string? SuggestedKeywords { get; set; }
    public string? SuggestedQuizTopic { get; set; }
    public string? SuggestedCrosswordTopic { get; set; }
    public string? SuggestedLinks { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }

    // Navigation properties
    public Lesson Lesson { get; set; } = null!;
}
