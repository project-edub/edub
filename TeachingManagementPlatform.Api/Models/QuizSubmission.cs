namespace TeachingManagementPlatform.Api.Models;

public class QuizSubmission
{
    public int Id { get; set; }
    public int QuizGameId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string AnswersJson { get; set; } = "[]"; // JSON array of { questionId, answerIndex/answerText }
    public int TotalQuestions { get; set; }
    public int CorrectCount { get; set; }
    public decimal ScorePercent { get; set; }
    public DateTime SubmittedAt { get; set; }

    // Navigation
    public QuizGame QuizGame { get; set; } = null!;
}
