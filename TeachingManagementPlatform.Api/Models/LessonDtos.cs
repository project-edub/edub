using System.ComponentModel.DataAnnotations;

namespace TeachingManagementPlatform.Api.Models;

public class LessonDetailResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
    public int SuggestedPeriods { get; set; } = 1;
    public DateTime? ScheduledDate { get; set; }
    public List<DocumentResponse> Documents { get; set; } = new();
    public List<AttachmentResponse> Attachments { get; set; } = new();
    public List<MiniGameResponse> MiniGames { get; set; } = new();
}

public class UpdateLessonNameRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;
}

public class UpdateLessonPeriodsRequest
{
    [Range(1, 20)]
    public int SuggestedPeriods { get; set; } = 1;
}

public class CreateDocumentRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Link { get; set; } = string.Empty;

    public string? PageRange { get; set; }
}

public class UpdateDocumentRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Link { get; set; } = string.Empty;

    public string? PageRange { get; set; }
}

public class DocumentResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Link { get; set; } = string.Empty;
    public string? PageRange { get; set; }
}

public class AttachmentResponse
{
    public int Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FileReference { get; set; } = string.Empty;
    public string? FileUrl { get; set; }
    public long FileSize { get; set; }
}

public class AddAttachmentFromStorageRequest
{
    [Required]
    public int StorageItemId { get; set; }
}

public class MiniGameResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Type { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
