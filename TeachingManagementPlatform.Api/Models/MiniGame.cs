using System.Text.Json;

namespace TeachingManagementPlatform.Api.Models;

public class MiniGame
{
    public int Id { get; set; }
    public int LessonId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Type { get; set; } = "Quiz";
    public JsonDocument? Content { get; set; }
    public DateTime CreatedAt { get; set; }

    public Lesson Lesson { get; set; } = null!;
}
