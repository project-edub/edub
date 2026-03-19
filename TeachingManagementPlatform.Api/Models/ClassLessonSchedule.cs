namespace TeachingManagementPlatform.Api.Models;

public class ClassLessonSchedule
{
    public int Id { get; set; }
    public int ClassId { get; set; }
    public int LessonId { get; set; }
    public DateTime? ScheduledDate { get; set; }

    // Navigation properties
    public Class Class { get; set; } = null!;
    public Lesson Lesson { get; set; } = null!;
}
