namespace TeachingManagementPlatform.Api.Models;

// --- Request DTOs ---

public class UpdateScoreColumnMetadataRequest
{
    public int? Coefficient { get; set; }
    public bool IsAverageColumn { get; set; }
    public List<int> SourceColumnIds { get; set; } = new();
}

public class CellUpdateRequest
{
    public string ColumnName { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Note { get; set; }
}

public class ApplyTemplateRequest
{
    public int TemplateId { get; set; }
}

public class ClassificationRangeItemRequest
{
    public decimal MinScore { get; set; }
    public decimal MaxScore { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public class UpdateClassificationRangesRequest
{
    public List<ClassificationRangeItemRequest> Ranges { get; set; } = new();
}

public class ApplyTemplateResponse
{
    public int StudentListId { get; set; }
    public int TemplateId { get; set; }
    public string TemplateName { get; set; } = string.Empty;
    public List<StudentListColumnResponse> CreatedColumns { get; set; } = new();
}

// --- Response DTOs ---

public class ScoreColumnMetadataResponse
{
    public int Id { get; set; }
    public int StudentListColumnId { get; set; }
    public int? Coefficient { get; set; }
    public bool IsAverageColumn { get; set; }
    public List<int> SourceColumnIds { get; set; } = new();
}

public class CellUpdateResponse
{
    public bool Success { get; set; }
    public DateTime SavedAt { get; set; }
    public string? OldValue { get; set; }
    public string NewValue { get; set; } = string.Empty;
}

public class ScoreEditHistoryResponse
{
    public int Id { get; set; }
    public int StudentEntryId { get; set; }
    public string ColumnName { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string NewValue { get; set; } = string.Empty;
    public DateTime EditedAt { get; set; }
    public int EditedByUserId { get; set; }
}

public class ClassificationRangeResponse
{
    public int Id { get; set; }
    public int StudentListColumnId { get; set; }
    public decimal MinScore { get; set; }
    public decimal MaxScore { get; set; }
    public string Label { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}
