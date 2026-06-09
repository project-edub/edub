namespace TeachingManagementPlatform.Api.Models;

public class ScoreEditHistory
{
    public int Id { get; set; }
    public int StudentEntryId { get; set; }
    public string ColumnName { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string NewValue { get; set; } = string.Empty;
    public DateTime EditedAt { get; set; }
    public int EditedByUserId { get; set; }

    // Navigation properties
    public StudentEntry StudentEntry { get; set; } = null!;
}
