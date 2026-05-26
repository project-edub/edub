using System.ComponentModel.DataAnnotations;

namespace TeachingManagementPlatform.Api.Models;

public class QuizGenerationRequest
{
    [MaxLength(5000)]
    public string? Prompt { get; set; }

    [Range(1, 30)]
    public int QuestionCount { get; set; } = 10;

    [MaxLength(100)]
    public string? Topic { get; set; }

    [MaxLength(50)]
    public string? Difficulty { get; set; }

    [MaxLength(20)]
    public string Language { get; set; } = "vi";

    [EmailAddress]
    public string? TeacherGoogleEmail { get; set; }

    [MaxLength(260)]
    public string? SourceFileName { get; set; }

    [MaxLength(20)]
    public string? SourceFileExtension { get; set; }
}

public class QuizGenerationResponse
{
    public int RequestedQuestionCount { get; set; }

    public int GeneratedQuestionCount { get; set; }

    public List<GeneratedQuizQuestion> Questions { get; set; } = new();

    public List<string> Warnings { get; set; } = new();

    public string? GoogleFormId { get; set; }

    public string? GoogleFormUrl { get; set; }

    public string? GoogleDriveUrl { get; set; }
}

public class GeneratedQuizQuestion
{
    [Required]
    public string Question { get; set; } = string.Empty;

    [MinLength(4)]
    [MaxLength(4)]
    public List<GeneratedQuizOption> Options { get; set; } = new();

    [Range(0, 3)]
    public int CorrectAnswerIndex { get; set; }

    [MaxLength(2000)]
    public string? Explanation { get; set; }
}

public class GeneratedQuizOption
{
    [Required]
    public string Text { get; set; } = string.Empty;
}

public class QuizGenerationLimits
{
    [Range(1, 100)]
    public int MaxQuestions { get; set; } = 30;

    [Range(1, 200)]
    public int MaxFileSizeMb { get; set; } = 20;

    [Range(1000, 1000000)]
    public int MaxInputCharacters { get; set; } = 50000;

    public string[] AllowedExtensions { get; set; } = [".docx", ".xlsx", ".pdf"];
}

public class GoogleFormsExportSettings
{
    [Required]
    public string ServiceAccountJsonPath { get; set; } = string.Empty;

    public string? DriveFolderId { get; set; }

    [Required]
    public string DefaultShareRole { get; set; } = "writer";
}

public class CreateGoogleFormRequest
{
    public string Title { get; set; } = "Quiz";
    public List<GeneratedQuizQuestion> Questions { get; set; } = new();
    public string? TeacherGoogleEmail { get; set; }
    public string? GoogleAccessToken { get; set; }
}