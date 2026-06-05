namespace TeachingManagementPlatform.Api.Models;

public class ClassificationRange
{
    public int Id { get; set; }
    public int StudentListColumnId { get; set; }
    public decimal MinScore { get; set; }
    public decimal MaxScore { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    public StudentListColumn StudentListColumn { get; set; } = null!;
}
