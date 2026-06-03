using Microsoft.AspNetCore.Http;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface ICrosswordService
{
    Task<CrosswordUploadResponse> UploadAndExtractAsync(int userId, List<IFormFile> files);
    Task<CrosswordEstimateResponse> EstimateEcoinAsync(int userId, CrosswordEstimateRequest request);
    Task<CrosswordGenerateResponse> GenerateAsync(int userId, CrosswordGenerateRequest request);
    Task<CrosswordGenerateResponse> RegenerateAsync(int userId, int gameId, CrosswordGenerationConfig config);
    Task<CrosswordGameDto> GetByIdAsync(int userId, int gameId);
    Task UpdateAsync(int userId, int gameId, CrosswordGameDto dto);
    Task UpdateWordAsync(int userId, int gameId, int wordId, CrosswordWordUpdateRequest request);
    Task PublishAsync(int userId, int gameId, CrosswordPublishRequest request);
    Task<CrosswordPlayerDto> GetForPlayerAsync(string slug);
    Task ExportPdfAsync(int userId, int gameId);
    Task<List<CrosswordListItemDto>> GetListAsync(int userId);
    Task DeleteAsync(int userId, int gameId);
}
