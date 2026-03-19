namespace TeachingManagementPlatform.Api.Models;

public class LessonDocument
{
    public int Id { get; set; }
    public int LessonId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Link { get; set; } = string.Empty;
    public string? PageRange { get; set; }

    public Lesson Lesson { get; set; } = null!;
}
