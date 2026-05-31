namespace TeachingManagementPlatform.Api.Models;

public class StorageFileResponse
{
    public Stream Stream { get; set; } = Stream.Null;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/octet-stream";
}