using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface ILessonService
{
    Task<LessonDetailResponse> GetByIdAsync(int lessonId, int lecturerId);
    Task<LessonDetailResponse> UpdateNameAsync(int lessonId, int lecturerId, UpdateLessonNameRequest request);
    Task<DocumentResponse> AddDocumentAsync(int lessonId, int lecturerId, CreateDocumentRequest request);
    Task<DocumentResponse> UpdateDocumentAsync(int documentId, int lecturerId, UpdateDocumentRequest request);
    Task DeleteDocumentAsync(int documentId, int lecturerId);
    Task<AttachmentResponse> AddAttachmentAsync(int lessonId, int lecturerId, Stream fileStream, string fileName, long fileSize);
    Task<AttachmentResponse> AddAttachmentFromStorageAsync(int lessonId, int lecturerId, int storageItemId);
    Task DeleteAttachmentAsync(int attachmentId, int lecturerId);
    Task<(Stream stream, string fileName, string contentType)> GetAttachmentFileAsync(int attachmentId, int lecturerId);
}
