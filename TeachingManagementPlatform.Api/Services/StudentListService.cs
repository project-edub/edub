using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

public class StudentListService : IStudentListService
{
    private readonly ApplicationDbContext _context;

    public StudentListService(ApplicationDbContext context)
    {
        _context = context;
    }

    // --- Student List CRUD ---

    public async Task<StudentListResponse> GetByIdAsync(int studentListId, int lecturerId)
    {
        var studentList = await GetStudentListWithOwnershipCheck(studentListId, lecturerId);
        return MapToResponse(studentList);
    }

    public async Task<List<StudentListResponse>> GetAllByClassAsync(int classId, int lecturerId)
    {
        await EnsureClassOwnership(classId, lecturerId);

        return await _context.StudentLists
            .Where(sl => sl.ClassId == classId)
            .Include(sl => sl.Columns)
            .Include(sl => sl.Entries)
            .Select(sl => MapToResponse(sl))
            .ToListAsync();
    }

    public async Task<StudentListResponse> CreateAsync(int classId, int lecturerId, CreateStudentListRequest request)
    {
        await EnsureClassOwnership(classId, lecturerId);

        var studentList = new StudentList
        {
            ClassId = classId,
            Name = request.Name,
            IsMain = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.StudentLists.Add(studentList);
        await _context.SaveChangesAsync();

        return MapToResponse(studentList);
    }

    public async Task<StudentListResponse> UpdateAsync(int id, int lecturerId, UpdateStudentListRequest request)
    {
        var studentList = await GetStudentListWithOwnershipCheck(id, lecturerId);

        if (request.Name != null)
            studentList.Name = request.Name;

        await _context.SaveChangesAsync();

        return MapToResponse(studentList);
    }

    public async Task DeleteAsync(int id, int lecturerId)
    {
        var studentList = await GetStudentListWithOwnershipCheck(id, lecturerId);

        if (studentList.Columns.Count > 0)
        {
            _context.StudentListColumns.RemoveRange(studentList.Columns);
        }

        if (studentList.Entries.Count > 0)
        {
            _context.StudentEntries.RemoveRange(studentList.Entries);
        }

        _context.StudentLists.Remove(studentList);
        await _context.SaveChangesAsync();
    }

    public async Task<StudentListResponse> SetMainAsync(int id, int lecturerId)
    {
        var studentList = await GetStudentListWithOwnershipCheck(id, lecturerId);

        // Unset all other lists in the same class
        var siblingLists = await _context.StudentLists
            .Where(sl => sl.ClassId == studentList.ClassId)
            .ToListAsync();

        foreach (var sl in siblingLists)
            sl.IsMain = sl.Id == id;

        await _context.SaveChangesAsync();

        // Reload with includes
        return await GetStudentListResponseById(id);
    }

    public async Task<StudentListResponse> CloneAsync(int id, int lecturerId)
    {
        var source = await _context.StudentLists
            .Include(sl => sl.Columns)
            .Include(sl => sl.Entries)
            .Include(sl => sl.Class)
            .FirstOrDefaultAsync(sl => sl.Id == id);

        if (source == null || source.Class.LecturerId != lecturerId)
            throw new StudentListNotFoundException("Không tìm thấy danh sách sinh viên");

        var clone = new StudentList
        {
            ClassId = source.ClassId,
            Name = $"{source.Name} (Copy)",
            IsMain = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.StudentLists.Add(clone);
        await _context.SaveChangesAsync();

        // Clone columns
        foreach (var col in source.Columns.OrderBy(c => c.SortOrder))
        {
            _context.StudentListColumns.Add(new StudentListColumn
            {
                StudentListId = clone.Id,
                Name = col.Name,
                SortOrder = col.SortOrder
            });
        }

        // Clone entries
        foreach (var entry in source.Entries.OrderBy(e => e.SortOrder))
        {
            _context.StudentEntries.Add(new StudentEntry
            {
                StudentListId = clone.Id,
                Data = new Dictionary<string, string>(entry.Data),
                SortOrder = entry.SortOrder
            });
        }

        await _context.SaveChangesAsync();

        return await GetStudentListResponseById(clone.Id);
    }

    // --- Column CRUD ---

    public async Task<StudentListColumnResponse> AddColumnAsync(int studentListId, int lecturerId, CreateColumnRequest request)
    {
        await GetStudentListWithOwnershipCheck(studentListId, lecturerId);

        var column = new StudentListColumn
        {
            StudentListId = studentListId,
            Name = request.Name,
            SortOrder = request.SortOrder
        };

        _context.StudentListColumns.Add(column);
        await _context.SaveChangesAsync();

        return MapColumnToResponse(column);
    }

    public async Task<StudentListColumnResponse> UpdateColumnAsync(int columnId, int lecturerId, UpdateColumnRequest request)
    {
        var column = await _context.StudentListColumns
            .Include(c => c.StudentList)
                .ThenInclude(sl => sl.Class)
            .FirstOrDefaultAsync(c => c.Id == columnId);

        if (column == null || column.StudentList.Class.LecturerId != lecturerId)
            throw new StudentListNotFoundException("Không tìm thấy cột");

        if (request.Name != null)
            column.Name = request.Name;
        if (request.SortOrder.HasValue)
            column.SortOrder = request.SortOrder.Value;

        await _context.SaveChangesAsync();

        return MapColumnToResponse(column);
    }

    public async Task DeleteColumnAsync(int columnId, int lecturerId)
    {
        var column = await _context.StudentListColumns
            .Include(c => c.StudentList)
                .ThenInclude(sl => sl.Class)
            .FirstOrDefaultAsync(c => c.Id == columnId);

        if (column == null || column.StudentList.Class.LecturerId != lecturerId)
            throw new StudentListNotFoundException("Không tìm thấy cột");

        _context.StudentListColumns.Remove(column);
        await _context.SaveChangesAsync();
    }

    // --- Entry CRUD ---

    public async Task<StudentEntryResponse> AddEntryAsync(int studentListId, int lecturerId, CreateEntryRequest request)
    {
        await GetStudentListWithOwnershipCheck(studentListId, lecturerId);

        var entry = new StudentEntry
        {
            StudentListId = studentListId,
            Data = request.Data,
            SortOrder = request.SortOrder
        };

        _context.StudentEntries.Add(entry);
        await _context.SaveChangesAsync();

        return MapEntryToResponse(entry);
    }

    public async Task<StudentEntryResponse> UpdateEntryAsync(int entryId, int lecturerId, UpdateEntryRequest request)
    {
        var entry = await _context.StudentEntries
            .Include(e => e.StudentList)
                .ThenInclude(sl => sl.Class)
            .FirstOrDefaultAsync(e => e.Id == entryId);

        if (entry == null || entry.StudentList.Class.LecturerId != lecturerId)
            throw new StudentListNotFoundException("Không tìm thấy sinh viên");

        if (request.Data != null)
            entry.Data = request.Data;
        if (request.SortOrder.HasValue)
            entry.SortOrder = request.SortOrder.Value;

        await _context.SaveChangesAsync();

        return MapEntryToResponse(entry);
    }

    public async Task DeleteEntryAsync(int entryId, int lecturerId)
    {
        var entry = await _context.StudentEntries
            .Include(e => e.StudentList)
                .ThenInclude(sl => sl.Class)
            .FirstOrDefaultAsync(e => e.Id == entryId);

        if (entry == null || entry.StudentList.Class.LecturerId != lecturerId)
            throw new StudentListNotFoundException("Không tìm thấy sinh viên");

        _context.StudentEntries.Remove(entry);
        await _context.SaveChangesAsync();
    }

    // --- Private helpers ---

    private async Task EnsureClassOwnership(int classId, int lecturerId)
    {
        var cls = await _context.Classes.FirstOrDefaultAsync(c => c.Id == classId && c.LecturerId == lecturerId);
        if (cls == null)
            throw new ClassNotFoundException("Không tìm thấy lớp học");
    }

    private async Task<StudentList> GetStudentListWithOwnershipCheck(int studentListId, int lecturerId)
    {
        var studentList = await _context.StudentLists
            .Include(sl => sl.Columns)
            .Include(sl => sl.Entries)
            .Include(sl => sl.Class)
            .FirstOrDefaultAsync(sl => sl.Id == studentListId);

        if (studentList == null || studentList.Class.LecturerId != lecturerId)
            throw new StudentListNotFoundException("Không tìm thấy danh sách sinh viên");

        return studentList;
    }

    private async Task<StudentListResponse> GetStudentListResponseById(int id)
    {
        var sl = await _context.StudentLists
            .Include(s => s.Columns)
            .Include(s => s.Entries)
            .FirstAsync(s => s.Id == id);

        return MapToResponse(sl);
    }

    private static StudentListResponse MapToResponse(StudentList sl)
    {
        return new StudentListResponse
        {
            Id = sl.Id,
            ClassId = sl.ClassId,
            Name = sl.Name,
            IsMain = sl.IsMain,
            CreatedAt = sl.CreatedAt,
            Columns = sl.Columns?.OrderBy(c => c.SortOrder).Select(MapColumnToResponse).ToList() ?? new(),
            Entries = sl.Entries?.OrderBy(e => e.SortOrder).Select(MapEntryToResponse).ToList() ?? new()
        };
    }

    private static StudentListColumnResponse MapColumnToResponse(StudentListColumn col)
    {
        return new StudentListColumnResponse
        {
            Id = col.Id,
            StudentListId = col.StudentListId,
            Name = col.Name,
            SortOrder = col.SortOrder
        };
    }

    private static StudentEntryResponse MapEntryToResponse(StudentEntry entry)
    {
        return new StudentEntryResponse
        {
            Id = entry.Id,
            StudentListId = entry.StudentListId,
            Data = entry.Data,
            SortOrder = entry.SortOrder
        };
    }
}

public class StudentListNotFoundException : Exception
{
    public StudentListNotFoundException(string message) : base(message) { }
}
