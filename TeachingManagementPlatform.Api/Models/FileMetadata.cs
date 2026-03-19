namespace TeachingManagementPlatform.Api.Models;

public class FileMetadata
{
    public string Name { get; set; } = string.Empty;
    public long Size { get; set; }
    public DateTime ModifiedAt { get; set; }
}
