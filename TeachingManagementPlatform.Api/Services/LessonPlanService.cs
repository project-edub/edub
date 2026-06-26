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

        if (request.Lessons != null)
        {
            var existingLessonsById = plan.Lessons.ToDictionary(l => l.Id);
            var requestLessonIds = request.Lessons
                .Where(l => l.Id.HasValue)
                .Select(l => l.Id!.Value)
                .ToHashSet();

            var lessonsToRemove = existingLessonsById.Values
                .Where(l => !requestLessonIds.Contains(l.Id))
                .ToList();

            if (lessonsToRemove.Count > 0)
            {
                var removedLessonIds = lessonsToRemove.Select(l => l.Id).ToList();

                var documents = await _context.LessonDocuments
                    .Where(d => removedLessonIds.Contains(d.LessonId))
                    .ToListAsync();
                var attachments = await _context.LessonAttachments
                    .Where(a => removedLessonIds.Contains(a.LessonId))
                    .ToListAsync();
                var miniGames = await _context.MiniGames
                    .Where(g => removedLessonIds.Contains(g.LessonId))
                    .ToListAsync();
                var schedules = await _context.ClassLessonSchedules
                    .Where(s => removedLessonIds.Contains(s.LessonId))
                    .ToListAsync();

                _context.LessonDocuments.RemoveRange(documents);
                _context.LessonAttachments.RemoveRange(attachments);
                _context.MiniGames.RemoveRange(miniGames);
                _context.ClassLessonSchedules.RemoveRange(schedules);
                _context.Lessons.RemoveRange(lessonsToRemove);
            }

            foreach (var lessonReq in request.Lessons)
            {
                if (lessonReq.Id.HasValue && existingLessonsById.TryGetValue(lessonReq.Id.Value, out var existingLesson))
                {
                    existingLesson.Name = lessonReq.Name;
                    existingLesson.OrderIndex = lessonReq.SortOrder;
                    existingLesson.SuggestedPeriods = lessonReq.SuggestedPeriods;
                    continue;
                }

                plan.Lessons.Add(new Lesson
                {
                    Name = lessonReq.Name,
                    OrderIndex = lessonReq.SortOrder,
                    SuggestedPeriods = lessonReq.SuggestedPeriods
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
            .FirstOrDefaultAsync(lp => lp.Id == id && lp.LecturerId == lecturerId);

        if (plan == null)
            throw new LessonPlanNotFoundException("Không tìm thấy giáo án");

        // Get lesson IDs for this plan
        var lessonIds = await _context.Lessons
            .Where(l => l.LessonPlanId == id)
            .Select(l => l.Id)
            .ToListAsync();

        if (lessonIds.Count > 0)
        {
            // Delete all child entities of lessons
            _context.LessonDocuments.RemoveRange(
                await _context.LessonDocuments.Where(d => lessonIds.Contains(d.LessonId)).ToListAsync());
            _context.LessonAttachments.RemoveRange(
                await _context.LessonAttachments.Where(a => lessonIds.Contains(a.LessonId)).ToListAsync());
            _context.MiniGames.RemoveRange(
                await _context.MiniGames.Where(g => lessonIds.Contains(g.LessonId)).ToListAsync());
            _context.ClassLessonSchedules.RemoveRange(
                await _context.ClassLessonSchedules.Where(s => lessonIds.Contains(s.LessonId)).ToListAsync());
            _context.LessonSuggestionCaches.RemoveRange(
                await _context.LessonSuggestionCaches.Where(c => lessonIds.Contains(c.LessonId)).ToListAsync());

            // Delete lessons themselves
            _context.Lessons.RemoveRange(
                await _context.Lessons.Where(l => l.LessonPlanId == id).ToListAsync());
        }

        // Now delete the plan (no loaded navigation properties to conflict)
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
            IsShared = plan.IsShared,
            ShareCode = plan.ShareCode,
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
