namespace TeachingManagementPlatform.Api.Models;

public class QuizContent
{
    public List<QuizQuestion> Questions { get; set; } = new();
}

public class QuizQuestion
{
    public string Question { get; set; } = string.Empty;
    public List<string> Options { get; set; } = new();
    public int CorrectAnswerIndex { get; set; }
}
