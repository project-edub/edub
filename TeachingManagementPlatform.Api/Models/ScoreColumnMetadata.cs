namespace TeachingManagementPlatform.Api.Models;

public class ScoreColumnMetadata
{
    public int Id { get; set; }
    public int StudentListColumnId { get; set; }
    public int? Coefficient { get; set; }
    public bool IsAverageColumn { get; set; }
    public List<int> SourceColumnIds { get; set; } = new();

    // Navigation properties
    public StudentListColumn Column { get; set; } = null!;
}
