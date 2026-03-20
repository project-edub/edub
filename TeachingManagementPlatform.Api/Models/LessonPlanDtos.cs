using System.ComponentModel.DataAnnotations;

namespace TeachingManagementPlatform.Api.Models;

public class CreateLessonRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public class CreateLessonPlanRequest
{
    [Required]
    public string Subject { get; set; } = string.Empty;

    [Required]
    public string Grade { get; set; } = string.Empty;

    [Required]
    public string SchoolYearStart { get; set; } = string.Empty;

    [Required]
    public string SchoolYearEnd { get; set; } = string.Empty;

    public List<CreateLessonRequest> Lessons { get; set; } = new();
}

public class UpdateLessonRequest
{
    public int? Id { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public class UpdateLessonPlanRequest
{
    public string? Subject { get; set; }
    public string? Grade { get; set; }
    public string? SchoolYearStart { get; set; }
    public string? SchoolYearEnd { get; set; }
    public List<UpdateLessonRequest>? Lessons { get; set; }
}

public class LessonResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public class LessonPlanResponse
{
    public int Id { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Grade { get; set; } = string.Empty;
    public string SchoolYearStart { get; set; } = string.Empty;
    public string SchoolYearEnd { get; set; } = string.Empty;
    public List<LessonResponse> Lessons { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
