using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

public class LocalFileStorage : IFileStorage
{
    private readonly string _basePath;

    public LocalFileStorage(IConfiguration configuration)
    {
        _basePath = configuration["FileStorage:BasePath"] ?? "./uploads";
        Directory.CreateDirectory(_basePath);
    }

    public async Task<string> SaveFileAsync(Stream fileStream, string fileName, string? folderPrefix = null, long? contentLength = null)
    {
        var fileReference = CreateFileReference(fileName, folderPrefix);
        var filePath = Path.Combine(_basePath, fileReference.Replace('/', Path.DirectorySeparatorChar));
        var directoryPath = Path.GetDirectoryName(filePath);

        if (!string.IsNullOrWhiteSpace(directoryPath))
            Directory.CreateDirectory(directoryPath);

        using var outputStream = new FileStream(filePath, FileMode.Create, FileAccess.Write);
        await fileStream.CopyToAsync(outputStream);

        return fileReference;
    }

    public async Task<Stream> GetFileAsync(string fileReference)
    {
        var filePath = Path.Combine(_basePath, fileReference);

        if (!File.Exists(filePath))
            throw new FileNotFoundException("File not found.", fileReference);

        var memoryStream = new MemoryStream();
        using var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read);
        await fileStream.CopyToAsync(memoryStream);
        memoryStream.Position = 0;

        return memoryStream;
    }

    public Task DeleteFileAsync(string fileReference)
    {
        var filePath = Path.Combine(_basePath, fileReference);

        if (File.Exists(filePath))
            File.Delete(filePath);

        return Task.CompletedTask;
    }

    public Task<FileMetadata> GetMetadataAsync(string fileReference)
    {
        var filePath = Path.Combine(_basePath, fileReference);

        if (!File.Exists(filePath))
            throw new FileNotFoundException("File not found.", fileReference);

        var fileInfo = new FileInfo(filePath);

        return Task.FromResult(new FileMetadata
        {
            Name = fileInfo.Name,
            Size = fileInfo.Length,
            ModifiedAt = fileInfo.LastWriteTimeUtc
        });
    }

    public string GetPublicUrl(string fileReference)
    {
        return $"/uploads/{fileReference.Replace('\\', '/')}";
    }

    private static string CreateFileReference(string fileName, string? folderPrefix)
    {
        var extension = Path.GetExtension(fileName);
        var normalizedPrefix = NormalizePrefix(folderPrefix);
        var fileNamePart = $"{Guid.NewGuid()}{extension}";

        return string.IsNullOrWhiteSpace(normalizedPrefix)
            ? fileNamePart
            : $"{normalizedPrefix}/{fileNamePart}";
    }

    private static string? NormalizePrefix(string? folderPrefix)
    {
        if (string.IsNullOrWhiteSpace(folderPrefix))
            return null;

        var segments = folderPrefix
            .Replace('\\', '/')
            .Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(segment => segment.Trim())
            .Where(segment => segment.Length > 0 && segment != "." && segment != "..");

        return string.Join('/', segments);
    }
}
