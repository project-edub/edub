using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

public class ClassService : IClassService
{
    private readonly ApplicationDbContext _context;

    public ClassService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ClassResponse>> GetAllAsync(int lecturerId)
    {
        return await _context.Classes
            .Where(c => c.LecturerId == lecturerId)
            .Select(c => new ClassResponse
            {
                Id = c.Id,
                Name = c.Name,
                Year = c.Year,
                AssignedLessonPlanId = c.AssignedLessonPlanId,
                StudentCount = c.StudentLists
                    .Where(sl => sl.IsMain)
                    .SelectMany(sl => sl.Entries)
                    .Count(),
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt
            })
            .ToListAsync();
    }

    public async Task<ClassResponse> GetByIdAsync(int id, int lecturerId)
    {
        var cls = await _context.Classes
            .Include(c => c.StudentLists)
                .ThenInclude(sl => sl.Entries)
            .FirstOrDefaultAsync(c => c.Id == id && c.LecturerId == lecturerId);

        if (cls == null)
            throw new ClassNotFoundException("Không tìm thấy lớp học");

        return MapToResponse(cls);
    }

    public async Task<ClassResponse> CreateAsync(int lecturerId, CreateClassRequest request)
    {
        var cls = new Class
        {
            LecturerId = lecturerId,
            Name = request.Name,
            Year = request.Year,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Classes.Add(cls);
        await _context.SaveChangesAsync();

        return MapToResponse(cls);
    }

    public async Task<ClassResponse> UpdateAsync(int id, int lecturerId, UpdateClassRequest request)
    {
        var cls = await _context.Classes
            .Include(c => c.StudentLists)
                .ThenInclude(sl => sl.Entries)
            .FirstOrDefaultAsync(c => c.Id == id && c.LecturerId == lecturerId);

        if (cls == null)
            throw new ClassNotFoundException("Không tìm thấy lớp học");

        if (request.Name != null)
            cls.Name = request.Name;

        if (request.Year != null)
            cls.Year = request.Year;

        cls.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return MapToResponse(cls);
    }

    public async Task DeleteAsync(int id, int lecturerId)
    {
        var cls = await _context.Classes
            .Include(c => c.StudentLists)
            .FirstOrDefaultAsync(c => c.Id == id && c.LecturerId == lecturerId);

        if (cls == null)
            throw new ClassNotFoundException("Không tìm thấy lớp học");

        // Cascade delete: EF Core handles StudentLists via cascade config,
        // but we also clear the lesson plan assignment
        cls.AssignedLessonPlanId = null;

        _context.Classes.Remove(cls);
        await _context.SaveChangesAsync();
    }

    private static ClassResponse MapToResponse(Class cls)
    {
        var mainList = cls.StudentLists?.FirstOrDefault(sl => sl.IsMain);
        return new ClassResponse
        {
            Id = cls.Id,
            Name = cls.Name,
            Year = cls.Year,
            AssignedLessonPlanId = cls.AssignedLessonPlanId,
            StudentCount = mainList?.Entries?.Count ?? 0,
            CreatedAt = cls.CreatedAt,
            UpdatedAt = cls.UpdatedAt
        };
    }
}

public class ClassNotFoundException : Exception
{
    public ClassNotFoundException(string message) : base(message) { }
}
