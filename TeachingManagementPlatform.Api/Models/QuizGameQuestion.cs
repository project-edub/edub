namespace TeachingManagementPlatform.Api.Models;

public class QuizGameQuestion
{
    public int Id { get; set; }
    public int QuizGameId { get; set; }
    public int Number { get; set; }
    public string QuestionType { get; set; } = "multiple_choice"; // "multiple_choice" | "true_false" | "fill_in_blank"
    public string QuestionText { get; set; } = string.Empty;
    public string OptionsJson { get; set; } = "[]"; // JSON array of option strings
    public int CorrectAnswerIndex { get; set; }
    public string? CorrectAnswerText { get; set; } // For fill_in_blank type
    public string? Explanation { get; set; }
    public string Difficulty { get; set; } = "medium";

    // Navigation
    public QuizGame QuizGame { get; set; } = null!;
}
