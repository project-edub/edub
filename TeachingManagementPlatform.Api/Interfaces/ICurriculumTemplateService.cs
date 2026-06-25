using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface ICurriculumTemplateService
{
    Task<List<CurriculumTemplateResponse>> GetTemplatesAsync(string? subject, int? grade);
    Task<List<CurriculumTemplateLessonResponse>> GetTemplateLessonsAsync(int templateId);
    Task<GenerateFromTemplateResponse> GenerateFromTemplateAsync(int lessonPlanId, int templateId, int lecturerId);
    Task<CurriculumTemplateResponse> SaveAsTemplateAsync(int lessonPlanId, int lecturerId, SaveAsTemplateRequest request);
    Task<CurriculumTemplateResponse> CreateTemplateAsync(CreateCurriculumTemplateRequest request);
    Task<CurriculumTemplateResponse> UpdateTemplateAsync(int id, UpdateCurriculumTemplateRequest request);
    Task DeleteTemplateAsync(int id);
    Task<List<CurriculumTemplateLessonResponse>> UpdateTemplateLessonsAsync(int templateId, UpdateTemplateLessonsRequest request);
}
