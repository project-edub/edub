namespace TeachingManagementPlatform.Api.Models;

public class CurriculumTemplate
{
    public int Id { get; set; }
    public string Subject { get; set; } = string.Empty;
    public int Grade { get; set; }
    public string? BookSet { get; set; }
    public int? CreatedBy { get; set; }
    public bool IsPublic { get; set; }
    public string? SourceNote { get; set; }
    public int UsageCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    public User? Creator { get; set; }
    public ICollection<CurriculumTemplateLesson> Lessons { get; set; } = new List<CurriculumTemplateLesson>();
}
