using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface IScoreListService
{
    // Column metadata
    Task<ScoreColumnMetadataResponse> UpdateColumnMetadata(int columnId, int lecturerId, UpdateScoreColumnMetadataRequest request);
    Task<List<ScoreColumnMetadataResponse>> GetColumnMetadata(int studentListId, int lecturerId);

    // Cell update
    Task<CellUpdateResponse> UpdateCell(int entryId, int lecturerId, string columnName, string newValue, string? note = null);

    // Edit history
    Task<List<ScoreEditHistoryResponse>> GetEditHistory(int studentEntryId, int lecturerId);

    // Apply template
    Task<ApplyTemplateResponse> ApplyTemplate(int studentListId, int lecturerId, int templateId);

    // Classification ranges
    Task<List<ClassificationRangeResponse>> GetClassificationRanges(int columnId, int lecturerId);
    Task<List<ClassificationRangeResponse>> UpdateClassificationRanges(int columnId, int lecturerId, List<ClassificationRangeItemRequest> ranges);
}
