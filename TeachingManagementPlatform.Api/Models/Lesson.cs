namespace TeachingManagementPlatform.Api.Models;

public class Lesson
{
    public int Id { get; set; }
    public int LessonPlanId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
    public int SuggestedPeriods { get; set; } = 1;
    public DateTime? ScheduledDate { get; set; }

    // Navigation properties
    public LessonPlan LessonPlan { get; set; } = null!;
    public ICollection<LessonDocument> Documents { get; set; } = new List<LessonDocument>();
    public ICollection<LessonAttachment> Attachments { get; set; } = new List<LessonAttachment>();
    public ICollection<MiniGame> MiniGames { get; set; } = new List<MiniGame>();
    public ICollection<ClassLessonSchedule> ClassSchedules { get; set; } = new List<ClassLessonSchedule>();
}
