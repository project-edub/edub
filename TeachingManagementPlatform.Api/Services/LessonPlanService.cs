using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

public class LessonPlanService : ILessonPlanService
{
    private readonly ApplicationDbContext _context;

    public LessonPlanService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<LessonPlanResponse>> GetAllAsync(int lecturerId, string? grade = null, string? subject = null, string? schoolYear = null)
    {
        var query = _context.LessonPlans
            .Where(lp => lp.LecturerId == lecturerId)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(grade))
            query = query.Where(lp => lp.Grade == grade);

        if (!string.IsNullOrWhiteSpace(subject))
            query = query.Where(lp => lp.Subject.Contains(subject));

        if (!string.IsNullOrWhiteSpace(schoolYear))
            query = query.Where(lp => lp.SchoolYearStart == schoolYear || lp.SchoolYearEnd == schoolYear);

        return await query
            .Include(lp => lp.Lessons.OrderBy(l => l.OrderIndex))
            .Select(lp => MapToResponse(lp))
            .ToListAsync();
    }

    public async Task<LessonPlanResponse> GetByIdAsync(int id, int lecturerId)
    {
        var plan = await _context.LessonPlans
            .Include(lp => lp.Lessons.OrderBy(l => l.OrderIndex))
            .FirstOrDefaultAsync(lp => lp.Id == id && lp.LecturerId == lecturerId);

        if (plan == null)
            throw new LessonPlanNotFoundException("Không tìm thấy giáo án");

        return MapToResponse(plan);
    }

    public async Task<LessonPlanResponse> CreateAsync(int lecturerId, CreateLessonPlanRequest request)
    {
        var plan = new LessonPlan
        {
            LecturerId = lecturerId,
            Subject = request.Subject,
            Grade = request.Grade,
            SchoolYearStart = request.SchoolYearStart,
            SchoolYearEnd = request.SchoolYearEnd,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        foreach (var lessonReq in request.Lessons)
        {
            plan.Lessons.Add(new Lesson
            {
                Name = lessonReq.Name,
                OrderIndex = lessonReq.SortOrder
            });
        }

        _context.LessonPlans.Add(plan);
        await _context.SaveChangesAsync();

        return MapToResponse(plan);
    }

    public async Task<LessonPlanResponse> UpdateAsync(int id, int lecturerId, UpdateLessonPlanRequest request)
    {
        var plan = await _context.LessonPlans
            .Include(lp => lp.Lessons)
            .FirstOrDefaultAsync(lp => lp.Id == id && lp.LecturerId == lecturerId);

        if (plan == null)
            throw new LessonPlanNotFoundException("Không tìm thấy giáo án");

        if (request.Subject != null)
            plan.Subject = request.Subject;

        if (request.Grade != null)
            plan.Grade = request.Grade;

        if (request.SchoolYearStart != null)
            plan.SchoolYearStart = request.SchoolYearStart;

        if (request.SchoolYearEnd != null)
            plan.SchoolYearEnd = request.SchoolYearEnd;

        // Replace-all strategy for lessons
        if (request.Lessons != null)
        {
            _context.Lessons.RemoveRange(plan.Lessons);
            plan.Lessons.Clear();

            foreach (var lessonReq in request.Lessons)
            {
                plan.Lessons.Add(new Lesson
                {
                    Name = lessonReq.Name,
                    OrderIndex = lessonReq.SortOrder
                });
            }
        }

        plan.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return MapToResponse(plan);
    }

    public async Task DeleteAsync(int id, int lecturerId)
    {
        var plan = await _context.LessonPlans
            .Include(lp => lp.Lessons)
            .FirstOrDefaultAsync(lp => lp.Id == id && lp.LecturerId == lecturerId);

        if (plan == null)
            throw new LessonPlanNotFoundException("Không tìm thấy giáo án");

        _context.LessonPlans.Remove(plan);
        await _context.SaveChangesAsync();
    }

    private static LessonPlanResponse MapToResponse(LessonPlan plan)
    {
        return new LessonPlanResponse
        {
            Id = plan.Id,
            Subject = plan.Subject,
            Grade = plan.Grade,
            SchoolYearStart = plan.SchoolYearStart,
            SchoolYearEnd = plan.SchoolYearEnd,
            Lessons = plan.Lessons
                .OrderBy(l => l.OrderIndex)
                .Select(l => new LessonResponse
                {
                    Id = l.Id,
                    Name = l.Name,
                    SortOrder = l.OrderIndex
                })
                .ToList(),
            CreatedAt = plan.CreatedAt,
            UpdatedAt = plan.UpdatedAt
        };
    }
}

public class LessonPlanNotFoundException : Exception
{
    public LessonPlanNotFoundException(string message) : base(message) { }
}
