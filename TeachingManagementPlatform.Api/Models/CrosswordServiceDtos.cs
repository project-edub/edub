namespace TeachingManagementPlatform.Api.Models;

// ── Upload ──────────────────────────────────────────────────────────────────

/// <summary>
/// Per-file extraction result returned after uploading documents.
/// </summary>
public class CrosswordFileExtractResult
{
    public string FileName { get; set; } = string.Empty;
    /// <summary>Quality of extracted text: good | fair | poor | empty</summary>
    public string Quality { get; set; } = "good";
    public string ExtractedText { get; set; } = string.Empty;
}

/// <summary>
/// Response from UploadAndExtractAsync — contains per-file results and the temp game record id.
/// </summary>
public class CrosswordUploadResponse
{
    public int GameId { get; set; }
    public List<CrosswordFileExtractResult> Files { get; set; } = new();
}

// ── Estimate ─────────────────────────────────────────────────────────────────

public class CrosswordEstimateRequest
{
    public int WordCount { get; set; }
    public string ClueStyle { get; set; } = "definition";
    public string Language { get; set; } = "vi";
    public int FileCount { get; set; }
}

public class CrosswordEstimateBreakdown
{
    public int BaseCost { get; set; }
    public int ClueStyleModifier { get; set; }
    public int LanguageModifier { get; set; }
}

public class CrosswordEstimateResponse
{
    public int EcoinsRequired { get; set; }
    public CrosswordEstimateBreakdown Breakdown { get; set; } = new();
}

// ── Generate ─────────────────────────────────────────────────────────────────

public class CrosswordGenerateRequest
{
    public int GameId { get; set; }
    public CrosswordGenerationConfig Config { get; set; } = new();
    public string Title { get; set; } = string.Empty;
}

public class CrosswordGenerateResponse
{
    public int GameId { get; set; }
    public string Slug { get; set; } = string.Empty;
    public List<CrosswordWordDto> Words { get; set; } = new();
}

// ── Game DTO (teacher view) ───────────────────────────────────────────────────

public class CrosswordWordDetailDto
{
    public int Id { get; set; }
    public string Word { get; set; } = string.Empty;
    public string DisplayWord { get; set; } = string.Empty;
    public string Clue { get; set; } = string.Empty;
    public string Direction { get; set; } = "across";
    public int StartRow { get; set; }
    public int StartCol { get; set; }
    public int Number { get; set; }
    public string Difficulty { get; set; } = string.Empty;
    public string? SourceContext { get; set; }
}

public class CrosswordGameDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = "draft";
    public string Slug { get; set; } = string.Empty;
    public string ConfigJson { get; set; } = string.Empty;
    public string GridJson { get; set; } = string.Empty;
    public int EcoinsSpent { get; set; }
    public DateTime? Deadline { get; set; }
    public bool ShowAnswerAfterExpiry { get; set; }
    public int? MaxAttempts { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
    public List<CrosswordWordDetailDto> Words { get; set; } = new();
}

// ── Word update ───────────────────────────────────────────────────────────────

public class CrosswordWordUpdateRequest
{
    public string Word { get; set; } = string.Empty;
    public string Clue { get; set; } = string.Empty;
    public string Direction { get; set; } = "across";
    public int StartRow { get; set; }
    public int StartCol { get; set; }
    public int Number { get; set; }
}

// ── Publish ───────────────────────────────────────────────────────────────────

public class CrosswordPublishRequest
{
    public int? MaxAttempts { get; set; }
    public string GridJson { get; set; } = string.Empty;
    public string? Deadline { get; set; }
}

// ── Player DTO (public, answers hidden) ──────────────────────────────────────

public class CrosswordPlayerWordDto
{
    public int Id { get; set; }
    /// <summary>Masked word — letters replaced with underscores for the player.</summary>
    public string DisplayWord { get; set; } = string.Empty;
    public string Clue { get; set; } = string.Empty;
    public string Direction { get; set; } = "across";
    public int StartRow { get; set; }
    public int StartCol { get; set; }
    public int Number { get; set; }
    /// <summary>Length of the answer (so the grid can render the correct number of cells).</summary>
    public int WordLength { get; set; }
}

public class CrosswordPlayerDto
{
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string GridJson { get; set; } = string.Empty;
    public DateTime? Deadline { get; set; }
    public int? MaxAttempts { get; set; }
    public bool ShowAnswerAfterExpiry { get; set; }
    public bool IsExpired { get; set; }
    public List<CrosswordPlayerWordDto> Words { get; set; } = new();
}

// ── List ──────────────────────────────────────────────────────────────────────

public class CrosswordListItemDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = "draft";
    public DateTime CreatedAt { get; set; }
    public int WordCount { get; set; }
    public int EcoinsSpent { get; set; }
    public string Slug { get; set; } = string.Empty;
}

// ── Player Submit ─────────────────────────────────────────────────────────────

/// <summary>
/// Request body for student answer submission.
/// Key = wordId (int as string), Value = student's answer string.
/// </summary>
public class CrosswordSubmitRequest
{
    /// <summary>Dictionary mapping wordId to the student's answer for that word.</summary>
    public Dictionary<int, string> Answers { get; set; } = new();
}

/// <summary>
/// Per-word result after checking student answers.
/// </summary>
public class CrosswordWordResult
{
    public int WordId { get; set; }
    public bool IsCorrect { get; set; }
}

/// <summary>
/// Response returned after submitting answers.
/// </summary>
public class CrosswordSubmitResponse
{
    public List<CrosswordWordResult> Results { get; set; } = new();
    public int CorrectCount { get; set; }
    public int TotalCount { get; set; }
    public bool AllCorrect { get; set; }
}
