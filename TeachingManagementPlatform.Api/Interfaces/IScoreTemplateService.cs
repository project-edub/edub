using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface IScoreTemplateService
{
    Task<List<ScoreTemplateResponse>> GetAllAsync();
    Task<ScoreTemplateResponse> GetByIdAsync(int id);
    Task<ScoreTemplateResponse> CreateAsync(CreateScoreTemplateRequest request);
    Task<ScoreTemplateResponse> UpdateAsync(int id, UpdateScoreTemplateRequest request);
    Task DeleteAsync(int id);
}
