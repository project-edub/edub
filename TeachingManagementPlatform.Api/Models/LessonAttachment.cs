namespace TeachingManagementPlatform.Api.Models;

public class LessonAttachment
{
    public int Id { get; set; }
    public int LessonId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FileReference { get; set; } = string.Empty;
    public long FileSize { get; set; }

    public Lesson Lesson { get; set; } = null!;
}
