namespace TeachingManagementPlatform.Api.Models;

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? PasswordHash { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = "Lecturer"; // "Admin" | "Lecturer"
    public string? GoogleId { get; set; }
    public string Status { get; set; } = "Active"; // "Active" | "Inactive"
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    public LecturerProfile? LecturerProfile { get; set; }
    public ICollection<Class> Classes { get; set; } = new List<Class>();
    public ICollection<LessonPlan> LessonPlans { get; set; } = new List<LessonPlan>();
    public ICollection<StorageItem> StorageItems { get; set; } = new List<StorageItem>();
}
