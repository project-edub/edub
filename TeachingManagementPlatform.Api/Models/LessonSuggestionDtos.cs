using System.ComponentModel.DataAnnotations;

namespace TeachingManagementPlatform.Api.Models;

public class SuggestContentRequest
{
    public string? Description { get; set; }
}

public class LessonSuggestionResponse
{
    public List<SuggestedAttachmentDto> SuggestedAttachments { get; set; } = new();
    public List<string> SuggestedKeywords { get; set; } = new();
    public string? SuggestedQuizTopic { get; set; }
    public string? SuggestedCrosswordTopic { get; set; }
    public List<SuggestedLinkDto> SuggestedLinks { get; set; } = new();
}

public class SuggestedAttachmentDto
{
    public int FileId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public double Similarity { get; set; }
}

public class SuggestedLinkDto
{
    public string Url { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class AcceptSuggestionRequest
{
    /// <summary>
    /// Type of suggestion to accept: "attachment", "link", "quiz_topic", or "crossword_topic"
    /// </summary>
    [Required]
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// The value to apply — fileId for attachment, JSON for link, topic string for quiz/crossword
    /// </summary>
    [Required]
    public string Value { get; set; } = string.Empty;
}
