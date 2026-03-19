using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface IClassService
{
    Task<List<ClassResponse>> GetAllAsync(int lecturerId);
    Task<ClassResponse> GetByIdAsync(int id, int lecturerId);
    Task<ClassResponse> CreateAsync(int lecturerId, CreateClassRequest request);
    Task<ClassResponse> UpdateAsync(int id, int lecturerId, UpdateClassRequest request);
    Task DeleteAsync(int id, int lecturerId);
}
