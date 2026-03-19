namespace TeachingManagementPlatform.Api.Models;

public class ClassResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Year { get; set; } = string.Empty;
    public int? AssignedLessonPlanId { get; set; }
    public int StudentCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
