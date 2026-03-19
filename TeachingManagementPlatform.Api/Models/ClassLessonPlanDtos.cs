using System.ComponentModel.DataAnnotations;

namespace TeachingManagementPlatform.Api.Models;

public class AssignLessonPlanRequest
{
    [Required]
    public int LessonPlanId { get; set; }
}

public class UpdateLessonScheduleRequest
{
    public DateTime? ScheduledDate { get; set; }
}

public class ClassLessonPlanResponse
{
    public int LessonPlanId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Grade { get; set; } = string.Empty;
    public string SchoolYearStart { get; set; } = string.Empty;
    public string SchoolYearEnd { get; set; } = string.Empty;
    public List<ClassLessonResponse> Lessons { get; set; } = new();
}

public class ClassLessonResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
    public DateTime? ScheduledDate { get; set; }
    public List<DocumentResponse> Documents { get; set; } = new();
    public List<AttachmentResponse> Attachments { get; set; } = new();
    public List<MiniGameResponse> MiniGames { get; set; } = new();
}
