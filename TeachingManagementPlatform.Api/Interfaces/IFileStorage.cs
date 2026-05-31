using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface IFileStorage
{
    Task<string> SaveFileAsync(Stream fileStream, string fileName, string? folderPrefix = null, long? contentLength = null);
    Task<Stream> GetFileAsync(string fileReference);
    Task DeleteFileAsync(string fileReference);
    Task<FileMetadata> GetMetadataAsync(string fileReference);
    string GetPublicUrl(string fileReference);
}
