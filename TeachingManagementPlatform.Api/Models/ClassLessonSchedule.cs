namespace TeachingManagementPlatform.Api.Models;

public class ClassLessonSchedule
{
    public const string FinishStatus = "finish";
    public const string UnfinishStatus = "unfinish";
    public const string PendingStatus = "pending";

    public int Id { get; set; }
    public int ClassId { get; set; }
    public int LessonId { get; set; }
    public DateTime? ScheduledDate { get; set; }
    public string LessonStatus { get; set; } = PendingStatus;

    // Navigation properties
    public Class Class { get; set; } = null!;
    public Lesson Lesson { get; set; } = null!;
}
