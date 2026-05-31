using Amazon.S3;
using Amazon.S3.Model;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

public class CloudflareR2FileStorage : IFileStorage
{
    private readonly IAmazonS3 _client;
    private readonly string _bucketName;
    private readonly string _publicBaseUrl;

    public CloudflareR2FileStorage(IConfiguration configuration)
    {
        var accountId = configuration["R2:AccountId"] ?? throw new InvalidOperationException("R2:AccountId is not configured");
        var accessKeyId = configuration["R2:AccessKeyId"] ?? throw new InvalidOperationException("R2:AccessKeyId is not configured");
        var secretAccessKey = configuration["R2:SecretAccessKey"] ?? throw new InvalidOperationException("R2:SecretAccessKey is not configured");
        _bucketName = configuration["R2:BucketName"] ?? throw new InvalidOperationException("R2:BucketName is not configured");
        _publicBaseUrl = configuration["R2:PublicBaseUrl"] ?? throw new InvalidOperationException("R2:PublicBaseUrl is not configured");

        _client = new AmazonS3Client(accessKeyId, secretAccessKey, new AmazonS3Config
        {
            ServiceURL = $"https://{accountId}.r2.cloudflarestorage.com",
            ForcePathStyle = true,
            AuthenticationRegion = "auto"
        });
    }

    public async Task<string> SaveFileAsync(Stream fileStream, string fileName, string? folderPrefix = null, long? contentLength = null)
    {
        var objectKey = CreateObjectKey(fileName, folderPrefix);
        var tempFilePath = Path.GetTempFileName();

        try
        {
            await using (var tempFileStream = new FileStream(tempFilePath, FileMode.Create, FileAccess.Write, FileShare.None, 81920, useAsync: true))
            {
                if (fileStream.CanSeek)
                    fileStream.Position = 0;

                await fileStream.CopyToAsync(tempFileStream);
            }

            var request = new PutObjectRequest
            {
                BucketName = _bucketName,
                Key = objectKey,
                FilePath = tempFilePath,
                UseChunkEncoding = false
            };

            await _client.PutObjectAsync(request);
            return objectKey;
        }
        finally
        {
            try
            {
                if (File.Exists(tempFilePath))
                    File.Delete(tempFilePath);
            }
            catch
            {
                // Ignore temp file cleanup failures.
            }
        }
    }

    public async Task<Stream> GetFileAsync(string fileReference)
    {
        var response = await _client.GetObjectAsync(_bucketName, fileReference);
        var memoryStream = new MemoryStream();
        await response.ResponseStream.CopyToAsync(memoryStream);
        memoryStream.Position = 0;
        return memoryStream;
    }

    public async Task DeleteFileAsync(string fileReference)
    {
        await _client.DeleteObjectAsync(_bucketName, fileReference);
    }

    public async Task<FileMetadata> GetMetadataAsync(string fileReference)
    {
        var response = await _client.GetObjectMetadataAsync(_bucketName, fileReference);

        return new FileMetadata
        {
            Name = Path.GetFileName(fileReference),
            Size = response.ContentLength,
            ModifiedAt = response.LastModified?.ToUniversalTime() ?? DateTime.UtcNow
        };
    }

    public string GetPublicUrl(string fileReference)
    {
        return $"{_publicBaseUrl.TrimEnd('/')}/{fileReference.TrimStart('/')}";
    }

    private static string CreateObjectKey(string fileName, string? folderPrefix)
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