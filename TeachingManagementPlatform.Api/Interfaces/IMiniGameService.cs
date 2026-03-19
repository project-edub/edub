using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface IMiniGameService
{
    Task<MiniGameDetailResponse> CreateAsync(int lessonId, int lecturerId, CreateMiniGameRequest request);
    Task<MiniGameDetailResponse> GetByIdAsync(int id, int lecturerId);
    Task<MiniGamePlayResponse> GetPlayDataAsync(int id, int lecturerId);
    Task DeleteAsync(int id, int lecturerId);
}
