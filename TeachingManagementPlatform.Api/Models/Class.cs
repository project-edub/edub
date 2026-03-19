namespace TeachingManagementPlatform.Api.Models;

public class Class
{
    public int Id { get; set; }
    public int LecturerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Year { get; set; } = string.Empty;
    public int? AssignedLessonPlanId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    public User Lecturer { get; set; } = null!;
    public LessonPlan? AssignedLessonPlan { get; set; }
    public ICollection<StudentList> StudentLists { get; set; } = new List<StudentList>();
    public ICollection<ClassLessonSchedule> LessonSchedules { get; set; } = new List<ClassLessonSchedule>();
}
