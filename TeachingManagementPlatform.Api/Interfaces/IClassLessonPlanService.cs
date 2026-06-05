using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface IClassLessonPlanService
{
    Task<ClassLessonPlanResponse> AssignLessonPlanAsync(int classId, int lecturerId, AssignLessonPlanRequest request);
    Task UnassignLessonPlanAsync(int classId, int lecturerId);
    Task<ClassLessonPlanResponse?> GetAssignedPlanAsync(int classId, int lecturerId);
    Task<ClassLessonResponse> UpdateLessonScheduleAsync(int classId, int lessonId, int lecturerId, UpdateLessonScheduleRequest request);
}
