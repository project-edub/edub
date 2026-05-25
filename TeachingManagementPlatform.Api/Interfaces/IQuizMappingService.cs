using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface IQuizMappingService
{
    /// <summary>
    /// Validate AI response content and map to generated quiz question DTOs.
    /// Returns mapped questions and any warnings discovered during validation.
    /// </summary>
    (List<GeneratedQuizQuestion> Questions, List<string> Warnings) ValidateAndMap(QuizContent content, int requestedQuestionCount);
}
