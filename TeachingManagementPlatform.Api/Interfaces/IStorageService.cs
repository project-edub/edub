using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface IStorageService
{
    Task<List<StorageItemResponse>> ListItemsAsync(int lecturerId, int? folderId, StorageListRequest request);
    Task<StorageItemResponse> CreateFolderAsync(int lecturerId, CreateFolderRequest request);
    Task<StorageItemResponse> UploadFileAsync(int lecturerId, int? parentFolderId, Stream fileStream, string fileName, long fileSize);
    Task<StorageItemResponse> RenameAsync(int id, int lecturerId, RenameItemRequest request);
    Task DeleteAsync(int id, int lecturerId);
}
