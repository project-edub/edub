using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface ILessonSuggestionService
{
    Task<LessonSuggestionResponse?> GetCachedSuggestionAsync(int lessonId);
    Task<LessonSuggestionResponse> SuggestContentAsync(int lessonId, int lecturerId, string? description = null);
    Task<bool> AcceptSuggestionAsync(int lessonId, int lecturerId, AcceptSuggestionRequest request);
}
