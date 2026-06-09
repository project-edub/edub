namespace TeachingManagementPlatform.Api.Models;

// --- Request DTOs ---

public class CreateScoreTemplateRequest
{
    public string Name { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public List<ScoreTemplateColumnRequest> Columns { get; set; } = new();
}

public class UpdateScoreTemplateRequest
{
    public string Name { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public List<ScoreTemplateColumnRequest> Columns { get; set; } = new();
}

public class ScoreTemplateColumnRequest
{
    public int? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? Coefficient { get; set; }
    public bool IsAverageColumn { get; set; }
    public int SortOrder { get; set; }
}

// --- Response DTOs ---

public class ScoreTemplateResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public List<ScoreTemplateColumnResponse> Columns { get; set; } = new();
}

public class ScoreTemplateColumnResponse
{
    public int Id { get; set; }
    public int ScoreTemplateId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? Coefficient { get; set; }
    public bool IsAverageColumn { get; set; }
    public int SortOrder { get; set; }
}
