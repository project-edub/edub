using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

public class ScoreListService : IScoreListService
{
    private readonly ApplicationDbContext _context;

    public ScoreListService(ApplicationDbContext context)
    {
        _context = context;
    }

    // --- Column Metadata ---

    public async Task<ScoreColumnMetadataResponse> UpdateColumnMetadata(int columnId, int lecturerId, UpdateScoreColumnMetadataRequest request)
    {
        var column = await _context.StudentListColumns
            .Include(c => c.StudentList)
                .ThenInclude(sl => sl.Class)
            .FirstOrDefaultAsync(c => c.Id == columnId);

        if (column == null || column.StudentList.Class.LecturerId != lecturerId)
            throw new ScoreListNotFoundException("Không tìm thấy cột");

        var metadata = await _context.ScoreColumnMetadatas
            .FirstOrDefaultAsync(m => m.StudentListColumnId == columnId);

        if (metadata == null)
        {
            metadata = new ScoreColumnMetadata
            {
                StudentListColumnId = columnId,
                Coefficient = request.Coefficient,
                IsAverageColumn = request.IsAverageColumn,
                SourceColumnIds = request.SourceColumnIds
            };
            _context.ScoreColumnMetadatas.Add(metadata);
        }
        else
        {
            metadata.Coefficient = request.Coefficient;
            metadata.IsAverageColumn = request.IsAverageColumn;
            metadata.SourceColumnIds = request.SourceColumnIds;
        }

        await _context.SaveChangesAsync();

        return MapToResponse(metadata);
    }

    public async Task<List<ScoreColumnMetadataResponse>> GetColumnMetadata(int studentListId, int lecturerId)
    {
        var studentList = await _context.StudentLists
            .Include(sl => sl.Class)
            .Include(sl => sl.Columns)
            .FirstOrDefaultAsync(sl => sl.Id == studentListId);

        if (studentList == null || studentList.Class.LecturerId != lecturerId)
            throw new ScoreListNotFoundException("Không tìm thấy danh sách sinh viên");

        var columnIds = studentList.Columns.Select(c => c.Id).ToList();

        var metadataList = await _context.ScoreColumnMetadatas
            .Where(m => columnIds.Contains(m.StudentListColumnId))
            .ToListAsync();

        return metadataList.Select(MapToResponse).ToList();
    }

    // --- Cell Update ---

    public async Task<CellUpdateResponse> UpdateCell(int entryId, int lecturerId, string columnName, string newValue, string? note = null)
    {
        var entry = await _context.StudentEntries
            .Include(e => e.StudentList)
                .ThenInclude(sl => sl.Class)
            .FirstOrDefaultAsync(e => e.Id == entryId);

        if (entry == null || entry.StudentList.Class.LecturerId != lecturerId)
            throw new ScoreListNotFoundException("Không tìm thấy entry");

        // Get old value from entry.Data
        entry.Data.TryGetValue(columnName, out var oldValue);

        // Update entry.Data with new value
        entry.Data[columnName] = newValue;

        // Explicitly mark Data as modified — EF Core's change tracker does NOT detect
        // in-place mutations to Dictionary<string, string> with value converters.
        _context.Entry(entry).Property(e => e.Data).IsModified = true;

        var now = DateTime.UtcNow;

        // Create ScoreEditHistory if value changed
        if (oldValue != newValue)
        {
            var history = new ScoreEditHistory
            {
                StudentEntryId = entryId,
                ColumnName = columnName,
                OldValue = oldValue,
                NewValue = newValue,
                EditedAt = now,
                EditedByUserId = lecturerId
            };
            _context.ScoreEditHistories.Add(history);
        }

        await _context.SaveChangesAsync();

        return new CellUpdateResponse
        {
            Success = true,
            SavedAt = now,
            OldValue = oldValue,
            NewValue = newValue
        };
    }

    // --- Edit History ---

    public async Task<List<ScoreEditHistoryResponse>> GetEditHistory(int studentEntryId, int lecturerId)
    {
        var entry = await _context.StudentEntries
            .Include(e => e.StudentList)
                .ThenInclude(sl => sl.Class)
            .FirstOrDefaultAsync(e => e.Id == studentEntryId);

        if (entry == null || entry.StudentList.Class.LecturerId != lecturerId)
            throw new ScoreListNotFoundException("Không tìm thấy entry");

        var historyList = await _context.ScoreEditHistories
            .Where(h => h.StudentEntryId == studentEntryId)
            .OrderByDescending(h => h.EditedAt)
            .ToListAsync();

        return historyList.Select(h => new ScoreEditHistoryResponse
        {
            Id = h.Id,
            StudentEntryId = h.StudentEntryId,
            ColumnName = h.ColumnName,
            OldValue = h.OldValue,
            NewValue = h.NewValue,
            EditedAt = h.EditedAt,
            EditedByUserId = h.EditedByUserId
        }).ToList();
    }

    // --- Private helpers ---

    private static ScoreColumnMetadataResponse MapToResponse(ScoreColumnMetadata metadata)
    {
        return new ScoreColumnMetadataResponse
        {
            Id = metadata.Id,
            StudentListColumnId = metadata.StudentListColumnId,
            Coefficient = metadata.Coefficient,
            IsAverageColumn = metadata.IsAverageColumn,
            SourceColumnIds = metadata.SourceColumnIds
        };
    }

    // --- Classification Ranges ---

    public async Task<List<ClassificationRangeResponse>> GetClassificationRanges(int columnId, int lecturerId)
    {
        var column = await _context.StudentListColumns
            .Include(c => c.StudentList)
                .ThenInclude(sl => sl.Class)
            .FirstOrDefaultAsync(c => c.Id == columnId);

        if (column == null || column.StudentList.Class.LecturerId != lecturerId)
            throw new ScoreListNotFoundException("Không tìm thấy cột");

        var ranges = await _context.ClassificationRanges
            .Where(r => r.StudentListColumnId == columnId)
            .OrderBy(r => r.SortOrder)
            .ToListAsync();

        return ranges.Select(MapToRangeResponse).ToList();
    }

    public async Task<List<ClassificationRangeResponse>> UpdateClassificationRanges(int columnId, int lecturerId, List<ClassificationRangeItemRequest> ranges)
    {
        var column = await _context.StudentListColumns
            .Include(c => c.StudentList)
                .ThenInclude(sl => sl.Class)
            .FirstOrDefaultAsync(c => c.Id == columnId);

        if (column == null || column.StudentList.Class.LecturerId != lecturerId)
            throw new ScoreListNotFoundException("Không tìm thấy cột");

        // Validate ranges
        ValidateClassificationRanges(ranges);

        // Remove existing ranges for this column
        var existingRanges = await _context.ClassificationRanges
            .Where(r => r.StudentListColumnId == columnId)
            .ToListAsync();
        _context.ClassificationRanges.RemoveRange(existingRanges);

        // Add new ranges
        var newRanges = ranges.Select(r => new ClassificationRange
        {
            StudentListColumnId = columnId,
            MinScore = r.MinScore,
            MaxScore = r.MaxScore,
            Label = r.Label,
            Color = r.Color,
            SortOrder = r.SortOrder
        }).ToList();

        _context.ClassificationRanges.AddRange(newRanges);
        await _context.SaveChangesAsync();

        return newRanges.Select(MapToRangeResponse).ToList();
    }

    private static void ValidateClassificationRanges(List<ClassificationRangeItemRequest> ranges)
    {
        foreach (var range in ranges)
        {
            if (range.MinScore >= range.MaxScore)
                throw new ScoreListValidationException($"Khoảng điểm không hợp lệ: min ({range.MinScore}) phải nhỏ hơn max ({range.MaxScore})");
        }

        // Check for overlapping ranges
        var sorted = ranges.OrderBy(r => r.MinScore).ToList();
        for (int i = 0; i < sorted.Count - 1; i++)
        {
            if (sorted[i].MaxScore > sorted[i + 1].MinScore)
                throw new ScoreListValidationException($"Khoảng điểm chồng lấn: [{sorted[i].MinScore}, {sorted[i].MaxScore}] và [{sorted[i + 1].MinScore}, {sorted[i + 1].MaxScore}]");
        }
    }

    private static ClassificationRangeResponse MapToRangeResponse(ClassificationRange range)
    {
        return new ClassificationRangeResponse
        {
            Id = range.Id,
            StudentListColumnId = range.StudentListColumnId,
            MinScore = range.MinScore,
            MaxScore = range.MaxScore,
            Label = range.Label,
            Color = range.Color,
            SortOrder = range.SortOrder
        };
    }

    // --- Apply Template ---

    public async Task<ApplyTemplateResponse> ApplyTemplate(int studentListId, int lecturerId, int templateId)
    {
        // Verify student list ownership
        var studentList = await _context.StudentLists
            .Include(sl => sl.Class)
            .Include(sl => sl.Columns)
            .FirstOrDefaultAsync(sl => sl.Id == studentListId);

        if (studentList == null || studentList.Class.LecturerId != lecturerId)
            throw new ScoreListNotFoundException("Không tìm thấy danh sách sinh viên");

        // Look up the template with its columns
        var template = await _context.ScoreTemplates
            .Include(t => t.Columns)
            .FirstOrDefaultAsync(t => t.Id == templateId);

        if (template == null)
            throw new ScoreListNotFoundException("Không tìm thấy template");

        var createdColumns = new List<StudentListColumn>();

        // Determine the starting sortOrder so template columns go after existing ones
        var maxExistingSortOrder = studentList.Columns.Count > 0
            ? studentList.Columns.Max(c => c.SortOrder) + 1
            : 0;

        // Create StudentListColumns and ScoreColumnMetadata for each template column
        foreach (var templateCol in template.Columns.OrderBy(c => c.SortOrder))
        {
            // Create the StudentListColumn
            var column = new StudentListColumn
            {
                StudentListId = studentListId,
                Name = templateCol.Name,
                SortOrder = maxExistingSortOrder + templateCol.SortOrder
            };
            _context.StudentListColumns.Add(column);
            await _context.SaveChangesAsync(); // Save to get the column ID

            // Create ScoreColumnMetadata for this column
            var metadata = new ScoreColumnMetadata
            {
                StudentListColumnId = column.Id,
                Coefficient = templateCol.Coefficient,
                IsAverageColumn = templateCol.IsAverageColumn,
                SourceColumnIds = new List<int>()
            };
            _context.ScoreColumnMetadatas.Add(metadata);

            createdColumns.Add(column);
        }

        await _context.SaveChangesAsync();

        // For average columns, set SourceColumnIds to all non-average columns created from this template
        var averageColumns = createdColumns.Where(c =>
        {
            var meta = _context.ScoreColumnMetadatas.Local
                .FirstOrDefault(m => m.StudentListColumnId == c.Id);
            return meta?.IsAverageColumn == true;
        }).ToList();

        if (averageColumns.Any())
        {
            var sourceColumnIds = createdColumns
                .Where(c =>
                {
                    var meta = _context.ScoreColumnMetadatas.Local
                        .FirstOrDefault(m => m.StudentListColumnId == c.Id);
                    return meta?.IsAverageColumn != true;
                })
                .Select(c => c.Id)
                .ToList();

            foreach (var avgCol in averageColumns)
            {
                var meta = await _context.ScoreColumnMetadatas
                    .FirstAsync(m => m.StudentListColumnId == avgCol.Id);
                meta.SourceColumnIds = sourceColumnIds;
            }

            await _context.SaveChangesAsync();
        }

        return new ApplyTemplateResponse
        {
            StudentListId = studentListId,
            TemplateId = template.Id,
            TemplateName = template.Name,
            CreatedColumns = createdColumns.Select(c => new StudentListColumnResponse
            {
                Id = c.Id,
                StudentListId = c.StudentListId,
                Name = c.Name,
                SortOrder = c.SortOrder
            }).ToList()
        };
    }
}

public class ScoreListNotFoundException : Exception
{
    public ScoreListNotFoundException(string message) : base(message) { }
}

public class ScoreListValidationException : Exception
{
    public ScoreListValidationException(string message) : base(message) { }
}
