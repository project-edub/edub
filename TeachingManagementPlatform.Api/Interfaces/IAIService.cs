using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface IAIService
{
    Task<QuizContent> GenerateQuizAsync(List<DocumentInfo> documents, List<AttachmentInfo> attachments);
}

public class DocumentInfo
{
    public string Name { get; set; } = string.Empty;
    public string Link { get; set; } = string.Empty;
    public string? PageRange { get; set; }
}

public class AttachmentInfo
{
    public string FileName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
}
