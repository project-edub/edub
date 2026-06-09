namespace TeachingManagementPlatform.Api.Models;

public class ScoreTemplate
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;

    // Navigation properties
    public List<ScoreTemplateColumn> Columns { get; set; } = new();
}

public class ScoreTemplateColumn
{
    public int Id { get; set; }
    public int ScoreTemplateId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? Coefficient { get; set; }
    public bool IsAverageColumn { get; set; }
    public int SortOrder { get; set; }

    // Navigation properties
    public ScoreTemplate ScoreTemplate { get; set; } = null!;
}
