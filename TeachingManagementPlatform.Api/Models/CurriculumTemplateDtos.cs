using System.ComponentModel.DataAnnotations;

namespace TeachingManagementPlatform.Api.Models;

public class CurriculumTemplateResponse
{
    public int Id { get; set; }
    public string Subject { get; set; } = string.Empty;
    public int Grade { get; set; }
    public string? BookSet { get; set; }
    public int? CreatedBy { get; set; }
    public bool IsPublic { get; set; }
    public string? SourceNote { get; set; }
    public int UsageCount { get; set; }
    public int LessonCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CurriculumTemplateLessonResponse
{
    public int Id { get; set; }
    public int OrderIndex { get; set; }
    public string? ChapterName { get; set; }
    public string LessonName { get; set; } = string.Empty;
    public int SuggestedPeriods { get; set; }
}

public class GenerateFromTemplateRequest
{
    [Required]
    public int TemplateId { get; set; }
}

public class SaveAsTemplateRequest
{
    public bool IsPublic { get; set; }
    public string? BookSet { get; set; }
    public string? SourceNote { get; set; }
}

public class GenerateFromTemplateResponse
{
    public List<GeneratedLessonResponse> Lessons { get; set; } = new();
}

public class GeneratedLessonResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
}

public class CreateCurriculumTemplateRequest
{
    [Required]
    public string Subject { get; set; } = string.Empty;

    [Required]
    [Range(1, 12)]
    public int Grade { get; set; }

    public string? BookSet { get; set; }
    public string? SourceNote { get; set; }
    public List<CreateTemplateLessonRequest>? Lessons { get; set; }
}

public class UpdateCurriculumTemplateRequest
{
    public string? Subject { get; set; }
    public int? Grade { get; set; }
    public string? BookSet { get; set; }
    public string? SourceNote { get; set; }
}

public class CreateTemplateLessonRequest
{
    public int OrderIndex { get; set; }
    public string? ChapterName { get; set; }
    [Required]
    public string LessonName { get; set; } = string.Empty;
    [Range(1, 10)]
    public int SuggestedPeriods { get; set; } = 1;
}

public class UpdateTemplateLessonsRequest
{
    [Required]
    public List<CreateTemplateLessonRequest> Lessons { get; set; } = new();
}
