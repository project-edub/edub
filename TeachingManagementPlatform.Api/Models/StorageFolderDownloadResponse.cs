namespace TeachingManagementPlatform.Api.Models;

public class StorageFolderDownloadResponse
{
    public byte[] ZipBytes { get; set; } = Array.Empty<byte>();
    public string FolderName { get; set; } = string.Empty;
}
