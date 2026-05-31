namespace TeachingManagementPlatform.Api.Models;

public class StorageListRequest
{
    public string? Search { get; set; }
    public string? FileType { get; set; } // word, excel, powerpoint, text, pdf
    public string? DateRange { get; set; } // today, last3days, last7days, last30days, thisYear, custom
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? SortBy { get; set; } // name, date
    public string? SortDirection { get; set; } // asc, desc
    public bool FoldersFirst { get; set; } = true;
}

public class CreateFolderRequest
{
    public string Name { get; set; } = string.Empty;
    public int? ParentFolderId { get; set; }
}

public class RenameItemRequest
{
    public string Name { get; set; } = string.Empty;
}

public class StorageItemResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ItemType { get; set; } = string.Empty;
    public string? FileType { get; set; }
    public long? FileSize { get; set; }
    public DateTime ModifiedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public int? ParentFolderId { get; set; }
    public string? FileUrl { get; set; }
}

public class StorageQuotaResponse
{
    public long StorageUsedBytes { get; set; }
    public long StorageLimitBytes { get; set; }
    public string SubscriptionPackageName { get; set; } = string.Empty;
    public double UsagePercent { get; set; }
    public long RemainingBytes => Math.Max(0, StorageLimitBytes - StorageUsedBytes);
}
