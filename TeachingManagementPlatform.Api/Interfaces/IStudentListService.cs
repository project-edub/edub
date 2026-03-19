using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface IStudentListService
{
    // Student list CRUD
    Task<StudentListResponse> GetByIdAsync(int studentListId, int lecturerId);
    Task<List<StudentListResponse>> GetAllByClassAsync(int classId, int lecturerId);
    Task<StudentListResponse> CreateAsync(int classId, int lecturerId, CreateStudentListRequest request);
    Task<StudentListResponse> UpdateAsync(int id, int lecturerId, UpdateStudentListRequest request);
    Task DeleteAsync(int id, int lecturerId);
    Task<StudentListResponse> SetMainAsync(int id, int lecturerId);
    Task<StudentListResponse> CloneAsync(int id, int lecturerId);

    // Column CRUD
    Task<StudentListColumnResponse> AddColumnAsync(int studentListId, int lecturerId, CreateColumnRequest request);
    Task<StudentListColumnResponse> UpdateColumnAsync(int columnId, int lecturerId, UpdateColumnRequest request);
    Task DeleteColumnAsync(int columnId, int lecturerId);

    // Entry CRUD
    Task<StudentEntryResponse> AddEntryAsync(int studentListId, int lecturerId, CreateEntryRequest request);
    Task<StudentEntryResponse> UpdateEntryAsync(int entryId, int lecturerId, UpdateEntryRequest request);
    Task DeleteEntryAsync(int entryId, int lecturerId);
}
