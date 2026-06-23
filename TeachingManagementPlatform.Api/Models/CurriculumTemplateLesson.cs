namespace TeachingManagementPlatform.Api.Models;

public class CurriculumTemplateLesson
{
    public int Id { get; set; }
    public int TemplateId { get; set; }
    public int OrderIndex { get; set; }
    public string? ChapterName { get; set; }
    public string LessonName { get; set; } = string.Empty;
    public int SuggestedPeriods { get; set; } = 1;
    public DateTime CreatedAt { get; set; }

    // Navigation property
    public CurriculumTemplate Template { get; set; } = null!;
}
