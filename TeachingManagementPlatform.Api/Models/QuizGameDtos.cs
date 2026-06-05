namespace TeachingManagementPlatform.Api.Models;

// ── List ──────────────────────────────────────────────────────────────────────

public class QuizListItemDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = "draft";
    public string Slug { get; set; } = string.Empty;
    public int QuestionCount { get; set; }
    public int SubmissionCount { get; set; }
    public int EcoinsSpent { get; set; }
    public DateTime CreatedAt { get; set; }
}

// ── Detail (teacher view) ─────────────────────────────────────────────────────

public class QuizGameDetailDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = "draft";
    public string Slug { get; set; } = string.Empty;
    public string ConfigJson { get; set; } = string.Empty;
    public bool ShowAnswersAfterSubmit { get; set; }
    public bool RequireStudentName { get; set; }
    public int EcoinsSpent { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
    public List<QuizQuestionDetailDto> Questions { get; set; } = new();
}

public class QuizQuestionDetailDto
{
    public int Id { get; set; }
    public int Number { get; set; }
    public string QuestionType { get; set; } = "multiple_choice";
    public string QuestionText { get; set; } = string.Empty;
    public string OptionsJson { get; set; } = "[]";
    public int CorrectAnswerIndex { get; set; }
    public string? CorrectAnswerText { get; set; }
    public string? Explanation { get; set; }
    public string Difficulty { get; set; } = "medium";
}

// ── Publish ───────────────────────────────────────────────────────────────────

public class QuizPublishRequest
{
    public bool ShowAnswersAfterSubmit { get; set; } = true;
}

// ── Create empty quiz ─────────────────────────────────────────────────────────

public class CreateEmptyQuizRequest
{
    public string Title { get; set; } = string.Empty;
}

// ── Player (student view) ─────────────────────────────────────────────────────

public class QuizPlayerDto
{
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public bool ShowAnswersAfterSubmit { get; set; }
    public bool RequireStudentName { get; set; }
    public List<QuizPlayerQuestionDto> Questions { get; set; } = new();
}

public class QuizPlayerQuestionDto
{
    public int Id { get; set; }
    public int Number { get; set; }
    public string QuestionType { get; set; } = "multiple_choice";
    public string QuestionText { get; set; } = string.Empty;
    public string OptionsJson { get; set; } = "[]"; // Options but no correct answer
}

// ── Submit ────────────────────────────────────────────────────────────────────

public class QuizSubmitRequest
{
    public string StudentName { get; set; } = string.Empty;
    public List<QuizAnswerItem> Answers { get; set; } = new();
}

public class QuizAnswerItem
{
    public int QuestionId { get; set; }
    public int AnswerIndex { get; set; } = -1;
    public string? AnswerText { get; set; }
}

public class QuizSubmitResponse
{
    public int TotalQuestions { get; set; }
    public int CorrectCount { get; set; }
    public decimal ScorePercent { get; set; }
    public bool ShowAnswers { get; set; }
    public List<QuizQuestionResult>? Results { get; set; }
}

public class QuizQuestionResult
{
    public int QuestionId { get; set; }
    public bool IsCorrect { get; set; }
    public int CorrectAnswerIndex { get; set; }
    public string? CorrectAnswerText { get; set; }
    public string? Explanation { get; set; }
}

// ── Submissions list (teacher view) ──────────────────────────────────────────

public class QuizSubmissionDto
{
    public int Id { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public int TotalQuestions { get; set; }
    public int CorrectCount { get; set; }
    public decimal ScorePercent { get; set; }
    public DateTime SubmittedAt { get; set; }
}
