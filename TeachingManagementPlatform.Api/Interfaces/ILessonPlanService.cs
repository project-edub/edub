using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface ILessonPlanService
{
    Task<List<LessonPlanResponse>> GetAllAsync(int lecturerId, string? grade = null, string? subject = null, string? schoolYear = null);
    Task<LessonPlanResponse> GetByIdAsync(int id, int lecturerId);
    Task<LessonPlanResponse> CreateAsync(int lecturerId, CreateLessonPlanRequest request);
    Task<LessonPlanResponse> UpdateAsync(int id, int lecturerId, UpdateLessonPlanRequest request);
    Task DeleteAsync(int id, int lecturerId);
}
