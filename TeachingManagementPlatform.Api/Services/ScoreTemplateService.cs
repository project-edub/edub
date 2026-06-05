using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

public class ScoreTemplateService : IScoreTemplateService
{
    private readonly ApplicationDbContext _context;

    public ScoreTemplateService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ScoreTemplateResponse>> GetAllAsync()
    {
        var templates = await _context.ScoreTemplates
            .Include(t => t.Columns.OrderBy(c => c.SortOrder))
            .OrderBy(t => t.Name)
            .ToListAsync();

        return templates.Select(MapToResponse).ToList();
    }

    public async Task<ScoreTemplateResponse> GetByIdAsync(int id)
    {
        var template = await _context.ScoreTemplates
            .Include(t => t.Columns.OrderBy(c => c.SortOrder))
            .FirstOrDefaultAsync(t => t.Id == id);

        if (template == null)
            throw new ScoreTemplateNotFoundException("Không tìm thấy template");

        return MapToResponse(template);
    }

    public async Task<ScoreTemplateResponse> CreateAsync(CreateScoreTemplateRequest request)
    {
        var template = new ScoreTemplate
        {
            Name = request.Name,
            Subject = request.Subject,
            Columns = request.Columns.Select(c => new ScoreTemplateColumn
            {
                Name = c.Name,
                Coefficient = c.Coefficient,
                IsAverageColumn = c.IsAverageColumn,
                SortOrder = c.SortOrder
            }).ToList()
        };

        _context.ScoreTemplates.Add(template);
        await _context.SaveChangesAsync();

        return MapToResponse(template);
    }

    public async Task<ScoreTemplateResponse> UpdateAsync(int id, UpdateScoreTemplateRequest request)
    {
        var template = await _context.ScoreTemplates
            .Include(t => t.Columns)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (template == null)
            throw new ScoreTemplateNotFoundException("Không tìm thấy template");

        // Update template properties
        template.Name = request.Name;
        template.Subject = request.Subject;

        // Handle nested columns: add new, update existing, remove deleted
        var requestColumnIds = request.Columns
            .Where(c => c.Id.HasValue)
            .Select(c => c.Id!.Value)
            .ToHashSet();

        // Remove columns that are no longer in the request
        var columnsToRemove = template.Columns
            .Where(c => !requestColumnIds.Contains(c.Id))
            .ToList();
        _context.ScoreTemplateColumns.RemoveRange(columnsToRemove);

        // Update existing and add new columns
        foreach (var columnRequest in request.Columns)
        {
            if (columnRequest.Id.HasValue)
            {
                // Update existing column
                var existingColumn = template.Columns.FirstOrDefault(c => c.Id == columnRequest.Id.Value);
                if (existingColumn != null)
                {
                    existingColumn.Name = columnRequest.Name;
                    existingColumn.Coefficient = columnRequest.Coefficient;
                    existingColumn.IsAverageColumn = columnRequest.IsAverageColumn;
                    existingColumn.SortOrder = columnRequest.SortOrder;
                }
            }
            else
            {
                // Add new column
                template.Columns.Add(new ScoreTemplateColumn
                {
                    Name = columnRequest.Name,
                    Coefficient = columnRequest.Coefficient,
                    IsAverageColumn = columnRequest.IsAverageColumn,
                    SortOrder = columnRequest.SortOrder
                });
            }
        }

        await _context.SaveChangesAsync();

        // Reload to get ordered columns
        await _context.Entry(template)
            .Collection(t => t.Columns)
            .Query()
            .OrderBy(c => c.SortOrder)
            .LoadAsync();

        return MapToResponse(template);
    }

    public async Task DeleteAsync(int id)
    {
        var template = await _context.ScoreTemplates
            .Include(t => t.Columns)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (template == null)
            throw new ScoreTemplateNotFoundException("Không tìm thấy template");

        _context.ScoreTemplates.Remove(template);
        await _context.SaveChangesAsync();
    }

    private static ScoreTemplateResponse MapToResponse(ScoreTemplate template)
    {
        return new ScoreTemplateResponse
        {
            Id = template.Id,
            Name = template.Name,
            Subject = template.Subject,
            Columns = template.Columns.Select(c => new ScoreTemplateColumnResponse
            {
                Id = c.Id,
                ScoreTemplateId = c.ScoreTemplateId,
                Name = c.Name,
                Coefficient = c.Coefficient,
                IsAverageColumn = c.IsAverageColumn,
                SortOrder = c.SortOrder
            }).ToList()
        };
    }
}

public class ScoreTemplateNotFoundException : Exception
{
    public ScoreTemplateNotFoundException(string message) : base(message) { }
}
