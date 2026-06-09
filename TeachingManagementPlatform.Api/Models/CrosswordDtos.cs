namespace TeachingManagementPlatform.Api.Models;

/// <summary>
/// Configuration for crossword generation request.
/// </summary>
public class CrosswordGenerationConfig
{
    public int WordCount { get; set; } = 10;
    public string Difficulty { get; set; } = "medium"; // easy | medium | hard
    public string Language { get; set; } = "vi";       // vi | en
    public string ClueStyle { get; set; } = "definition"; // definition | fill-in-blank
    public string? Topic { get; set; }
    public List<string> ExcludeWords { get; set; } = new();
}

/// <summary>
/// Result returned by the AI service after generating crossword words.
/// </summary>
public class CrosswordAIResult
{
    public List<CrosswordWordDto> Words { get; set; } = new();
}

/// <summary>
/// A single word entry produced by the AI for the crossword.
/// </summary>
public class CrosswordWordDto
{
    public string Word { get; set; } = string.Empty;        // Normalized: uppercase, no diacritics
    public string DisplayWord { get; set; } = string.Empty; // Original word with diacritics
    public string Clue { get; set; } = string.Empty;
    public string Difficulty { get; set; } = string.Empty;  // easy | medium | hard
    public string? SourceContext { get; set; }
}
