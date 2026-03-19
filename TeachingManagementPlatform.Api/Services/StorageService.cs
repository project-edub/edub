using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

public class StorageService : IStorageService
{
    private readonly ApplicationDbContext _context;
    private readonly IFileStorage _fileStorage;

    private static readonly Dictionary<string, List<string>> FileTypeExtensions = new()
    {
        { "word", new List<string> { ".doc", ".docx" } },
        { "excel", new List<string> { ".xls", ".xlsx" } },
        { "powerpoint", new List<string> { ".ppt", ".pptx" } },
        { "text", new List<string> { ".txt" } },
        { "pdf", new List<string> { ".pdf" } }
    };

    public StorageService(ApplicationDbContext context, IFileStorage fileStorage)
    {
        _context = context;
        _fileStorage = fileStorage;
    }

    public async Task<List<StorageItemResponse>> ListItemsAsync(int lecturerId, int? folderId, StorageListRequest request)
    {
        var query = _context.StorageItems
            .Where(si => si.LecturerId == lecturerId && si.ParentFolderId == folderId)
            .AsQueryable();

        // Search filter
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(si => si.Name.ToLower().Contains(search));
        }

        // File type filter
        if (!string.IsNullOrWhiteSpace(request.FileType))
        {
            var fileType = request.FileType.ToLower();
            query = query.Where(si => si.ItemType == "File" && si.FileType != null && si.FileType.ToLower() == fileType);
        }

        // Date range filter
        if (!string.IsNullOrWhiteSpace(request.DateRange))
        {
            var now = DateTime.UtcNow;
            DateTime? rangeStart = null;
            DateTime? rangeEnd = null;

            switch (request.DateRange.ToLower())
            {
                case "today":
                    rangeStart = now.Date;
                    rangeEnd = now.Date.AddDays(1);
                    break;
                case "last3days":
                    rangeStart = now.Date.AddDays(-2);
                    rangeEnd = now.Date.AddDays(1);
                    break;
                case "last7days":
                    rangeStart = now.Date.AddDays(-6);
                    rangeEnd = now.Date.AddDays(1);
                    break;
                case "last30days":
                    rangeStart = now.Date.AddDays(-29);
                    rangeEnd = now.Date.AddDays(1);
                    break;
                case "thisyear":
                    rangeStart = new DateTime(now.Year, 1, 1);
                    rangeEnd = new DateTime(now.Year + 1, 1, 1);
                    break;
                case "custom":
                    rangeStart = request.StartDate;
                    rangeEnd = request.EndDate?.AddDays(1);
                    break;
            }

            if (rangeStart.HasValue)
                query = query.Where(si => si.ModifiedAt >= rangeStart.Value);
            if (rangeEnd.HasValue)
                query = query.Where(si => si.ModifiedAt < rangeEnd.Value);
        }

        // Sorting
        var sortBy = request.SortBy?.ToLower() ?? "name";
        var sortDesc = string.Equals(request.SortDirection, "desc", StringComparison.OrdinalIgnoreCase);

        if (request.FoldersFirst)
        {
            // Folders first, then sort within each group
            if (sortBy == "date")
            {
                query = sortDesc
                    ? query.OrderByDescending(si => si.ItemType == "Folder").ThenByDescending(si => si.ModifiedAt)
                    : query.OrderByDescending(si => si.ItemType == "Folder").ThenBy(si => si.ModifiedAt);
            }
            else
            {
                query = sortDesc
                    ? query.OrderByDescending(si => si.ItemType == "Folder").ThenByDescending(si => si.Name)
                    : query.OrderByDescending(si => si.ItemType == "Folder").ThenBy(si => si.Name);
            }
        }
        else
        {
            // Mixed: sort all items together
            if (sortBy == "date")
            {
                query = sortDesc
                    ? query.OrderByDescending(si => si.ModifiedAt)
                    : query.OrderBy(si => si.ModifiedAt);
            }
            else
            {
                query = sortDesc
                    ? query.OrderByDescending(si => si.Name)
                    : query.OrderBy(si => si.Name);
            }
        }

        var items = await query.ToListAsync();
        return items.Select(MapToResponse).ToList();
    }

    public async Task<StorageItemResponse> CreateFolderAsync(int lecturerId, CreateFolderRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new StorageValidationException("Tên thư mục không được để trống");

        // Validate parent folder belongs to lecturer
        if (request.ParentFolderId.HasValue)
        {
            var parent = await _context.StorageItems
                .FirstOrDefaultAsync(si => si.Id == request.ParentFolderId.Value
                    && si.LecturerId == lecturerId
                    && si.ItemType == "Folder");

            if (parent == null)
                throw new StorageItemNotFoundException("Không tìm thấy thư mục cha");
        }

        var folder = new StorageItem
        {
            LecturerId = lecturerId,
            ParentFolderId = request.ParentFolderId,
            Name = request.Name.Trim(),
            ItemType = "Folder",
            CreatedAt = DateTime.UtcNow,
            ModifiedAt = DateTime.UtcNow
        };

        _context.StorageItems.Add(folder);
        await _context.SaveChangesAsync();

        return MapToResponse(folder);
    }

    public async Task<StorageItemResponse> UploadFileAsync(int lecturerId, int? parentFolderId, Stream fileStream, string fileName, long fileSize)
    {
        if (string.IsNullOrWhiteSpace(fileName))
            throw new StorageValidationException("Tên tệp không được để trống");

        // Validate parent folder belongs to lecturer
        if (parentFolderId.HasValue)
        {
            var parent = await _context.StorageItems
                .FirstOrDefaultAsync(si => si.Id == parentFolderId.Value
                    && si.LecturerId == lecturerId
                    && si.ItemType == "Folder");

            if (parent == null)
                throw new StorageItemNotFoundException("Không tìm thấy thư mục cha");
        }

        var fileReference = await _fileStorage.SaveFileAsync(fileStream, fileName);
        var extension = Path.GetExtension(fileName).ToLower();
        var fileType = GetFileTypeFromExtension(extension);

        var item = new StorageItem
        {
            LecturerId = lecturerId,
            ParentFolderId = parentFolderId,
            Name = fileName,
            ItemType = "File",
            FileReference = fileReference,
            FileType = fileType,
            FileSize = fileSize,
            CreatedAt = DateTime.UtcNow,
            ModifiedAt = DateTime.UtcNow
        };

        _context.StorageItems.Add(item);
        await _context.SaveChangesAsync();

        return MapToResponse(item);
    }

    public async Task<StorageItemResponse> RenameAsync(int id, int lecturerId, RenameItemRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new StorageValidationException("Tên không được để trống");

        var item = await _context.StorageItems
            .FirstOrDefaultAsync(si => si.Id == id && si.LecturerId == lecturerId);

        if (item == null)
            throw new StorageItemNotFoundException("Không tìm thấy mục lưu trữ");

        item.Name = request.Name.Trim();
        item.ModifiedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return MapToResponse(item);
    }

    public async Task DeleteAsync(int id, int lecturerId)
    {
        var item = await _context.StorageItems
            .FirstOrDefaultAsync(si => si.Id == id && si.LecturerId == lecturerId);

        if (item == null)
            throw new StorageItemNotFoundException("Không tìm thấy mục lưu trữ");

        // Recursively delete children and physical files
        await DeleteItemRecursiveAsync(item);
        await _context.SaveChangesAsync();
    }

    private async Task DeleteItemRecursiveAsync(StorageItem item)
    {
        if (item.ItemType == "Folder")
        {
            var children = await _context.StorageItems
                .Where(si => si.ParentFolderId == item.Id)
                .ToListAsync();

            foreach (var child in children)
            {
                await DeleteItemRecursiveAsync(child);
            }
        }

        // Delete physical file if it's a file with a reference
        if (item.ItemType == "File" && !string.IsNullOrEmpty(item.FileReference))
        {
            await _fileStorage.DeleteFileAsync(item.FileReference);
        }

        _context.StorageItems.Remove(item);
    }

    private static string? GetFileTypeFromExtension(string extension)
    {
        foreach (var (type, extensions) in FileTypeExtensions)
        {
            if (extensions.Contains(extension))
                return type;
        }
        return null;
    }

    private static StorageItemResponse MapToResponse(StorageItem item)
    {
        return new StorageItemResponse
        {
            Id = item.Id,
            Name = item.Name,
            ItemType = item.ItemType,
            FileType = item.FileType,
            FileSize = item.FileSize,
            ModifiedAt = item.ModifiedAt,
            CreatedAt = item.CreatedAt,
            ParentFolderId = item.ParentFolderId
        };
    }
}

public class StorageItemNotFoundException : Exception
{
    public StorageItemNotFoundException(string message) : base(message) { }
}

public class StorageValidationException : Exception
{
    public StorageValidationException(string message) : base(message) { }
}
