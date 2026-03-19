namespace TeachingManagementPlatform.Api.Models;

public class LessonPlan
{
    public int Id { get; set; }
    public int LecturerId { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Grade { get; set; } = string.Empty;
    public string SchoolYearStart { get; set; } = string.Empty;
    public string SchoolYearEnd { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    public User Lecturer { get; set; } = null!;
    public ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();
    public ICollection<Class> AssignedClasses { get; set; } = new List<Class>();
}
