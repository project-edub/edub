using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface ILessonSuggestionService
{
    Task<LessonSuggestionResponse> SuggestContentAsync(int lessonId, int lecturerId);
    Task<bool> AcceptSuggestionAsync(int lessonId, int lecturerId, AcceptSuggestionRequest request);
}
