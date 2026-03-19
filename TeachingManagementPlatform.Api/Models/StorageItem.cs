namespace TeachingManagementPlatform.Api.Models;

public class StorageItem
{
    public int Id { get; set; }
    public int LecturerId { get; set; }
    public int? ParentFolderId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ItemType { get; set; } = "File"; // "File" | "Folder"
    public string? FileReference { get; set; }
    public string? FileType { get; set; }
    public long? FileSize { get; set; }
    public DateTime ModifiedAt { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public User Lecturer { get; set; } = null!;
    public StorageItem? ParentFolder { get; set; }
    public ICollection<StorageItem> Children { get; set; } = new List<StorageItem>();
}
