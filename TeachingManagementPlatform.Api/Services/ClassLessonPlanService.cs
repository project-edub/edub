using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

public class ClassLessonPlanService : IClassLessonPlanService
{
    private readonly ApplicationDbContext _context;
    private readonly IFileStorage _fileStorage;
    private static readonly HashSet<string> ValidLessonStatuses =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ClassLessonSchedule.FinishStatus,
            ClassLessonSchedule.UnfinishStatus,
            ClassLessonSchedule.PendingStatus
        };

    public ClassLessonPlanService(ApplicationDbContext context, IFileStorage fileStorage)
    {
        _context = context;
        _fileStorage = fileStorage;
    }

    public async Task<ClassLessonPlanResponse> AssignLessonPlanAsync(int classId, int lecturerId, AssignLessonPlanRequest request)
    {
        var cls = await _context.Classes
            .Include(c => c.LessonSchedules)
            .FirstOrDefaultAsync(c => c.Id == classId && c.LecturerId == lecturerId)
            ?? throw new ClassLessonPlanNotFoundException("Không tìm thấy lớp học");

        var plan = await _context.LessonPlans
            .Include(lp => lp.Lessons.OrderBy(l => l.OrderIndex))
                .ThenInclude(l => l.Documents)
            .Include(lp => lp.Lessons)
                .ThenInclude(l => l.Attachments)
            .Include(lp => lp.Lessons)
                .ThenInclude(l => l.MiniGames)
            .FirstOrDefaultAsync(lp => lp.Id == request.LessonPlanId && lp.LecturerId == lecturerId)
            ?? throw new ClassLessonPlanNotFoundException("Không tìm thấy giáo án");

        // Remove old schedules if reassigning
        if (cls.LessonSchedules.Any())
        {
            _context.ClassLessonSchedules.RemoveRange(cls.LessonSchedules);
        }

        cls.AssignedLessonPlanId = plan.Id;

        // Create schedule entries for each lesson
        foreach (var lesson in plan.Lessons)
        {
            _context.ClassLessonSchedules.Add(new ClassLessonSchedule
            {
                ClassId = classId,
                LessonId = lesson.Id,
                ScheduledDate = null,
                LessonStatus = ClassLessonSchedule.PendingStatus
            });
        }

        await _context.SaveChangesAsync();

        return MapToResponse(plan, classId);
    }

    public async Task<ClassLessonPlanResponse?> GetAssignedPlanAsync(int classId, int lecturerId)
    {
        var cls = await _context.Classes
            .FirstOrDefaultAsync(c => c.Id == classId && c.LecturerId == lecturerId)
            ?? throw new ClassLessonPlanNotFoundException("Không tìm thấy lớp học");

        if (cls.AssignedLessonPlanId == null)
            return null;

        var plan = await _context.LessonPlans
            .Include(lp => lp.Lessons.OrderBy(l => l.OrderIndex))
                .ThenInclude(l => l.Documents)
            .Include(lp => lp.Lessons)
                .ThenInclude(l => l.Attachments)
            .Include(lp => lp.Lessons)
                .ThenInclude(l => l.MiniGames)
            .FirstOrDefaultAsync(lp => lp.Id == cls.AssignedLessonPlanId)
            ?? throw new ClassLessonPlanNotFoundException("Không tìm thấy giáo án");

        return MapToResponse(plan, classId);
    }

    public async Task UnassignLessonPlanAsync(int classId, int lecturerId)
    {
        var cls = await _context.Classes
            .Include(c => c.LessonSchedules)
            .FirstOrDefaultAsync(c => c.Id == classId && c.LecturerId == lecturerId)
            ?? throw new ClassLessonPlanNotFoundException("Không tìm thấy lớp học");

        if (cls.AssignedLessonPlanId == null)
            throw new ClassLessonPlanNotFoundException("Lớp học chưa được gán giáo án");

        // Remove all lesson schedules for this class
        if (cls.LessonSchedules.Any())
        {
            _context.ClassLessonSchedules.RemoveRange(cls.LessonSchedules);
        }

        cls.AssignedLessonPlanId = null;
        await _context.SaveChangesAsync();
    }

    public async Task<ClassLessonResponse> UpdateLessonScheduleAsync(int classId, int lessonId, int lecturerId, UpdateLessonScheduleRequest request)
    {
        var cls = await _context.Classes
            .FirstOrDefaultAsync(c => c.Id == classId && c.LecturerId == lecturerId)
            ?? throw new ClassLessonPlanNotFoundException("Không tìm thấy lớp học");

        if (cls.AssignedLessonPlanId == null)
            throw new ClassLessonPlanNotFoundException("Lớp học chưa được gán giáo án");

        // Verify the lesson belongs to the assigned plan
        var lesson = await _context.Lessons
            .Include(l => l.Documents)
            .Include(l => l.Attachments)
            .Include(l => l.MiniGames)
            .FirstOrDefaultAsync(l => l.Id == lessonId && l.LessonPlanId == cls.AssignedLessonPlanId)
            ?? throw new ClassLessonPlanNotFoundException("Không tìm thấy bài học trong giáo án của lớp");

        var schedule = await _context.ClassLessonSchedules
            .FirstOrDefaultAsync(s => s.ClassId == classId && s.LessonId == lessonId);

        string? normalizedStatus = null;
        if (!string.IsNullOrWhiteSpace(request.LessonStatus))
        {
            normalizedStatus = request.LessonStatus.Trim().ToLowerInvariant();
            if (!ValidLessonStatuses.Contains(normalizedStatus))
            {
                throw new ClassLessonPlanNotFoundException("Trạng thái bài học không hợp lệ");
            }
        }

        if (schedule == null)
        {
            schedule = new ClassLessonSchedule
            {
                ClassId = classId,
                LessonId = lessonId,
                ScheduledDate = request.ScheduledDate,
                LessonStatus = normalizedStatus ?? ClassLessonSchedule.PendingStatus
            };
            _context.ClassLessonSchedules.Add(schedule);
        }
        else
        {
            schedule.ScheduledDate = request.ScheduledDate;
            if (normalizedStatus != null)
            {
                schedule.LessonStatus = normalizedStatus;
            }
        }

        await _context.SaveChangesAsync();

        return MapToLessonResponse(lesson, schedule.ScheduledDate, schedule.LessonStatus);
    }

    private ClassLessonPlanResponse MapToResponse(LessonPlan plan, int classId)
    {
        // Load schedules for this class
        var schedules = _context.ClassLessonSchedules
            .Where(s => s.ClassId == classId)
            .ToDictionary(s => s.LessonId, s => s);

        return new ClassLessonPlanResponse
        {
            LessonPlanId = plan.Id,
            Subject = plan.Subject,
            Grade = plan.Grade,
            SchoolYearStart = plan.SchoolYearStart,
            SchoolYearEnd = plan.SchoolYearEnd,
            Lessons = plan.Lessons
                .OrderBy(l => l.OrderIndex)
                .Select(l =>
                {
                    var schedule = schedules.GetValueOrDefault(l.Id);
                    return MapToLessonResponse(
                        l,
                        schedule?.ScheduledDate,
                        schedule?.LessonStatus ?? ClassLessonSchedule.PendingStatus);
                })
                .ToList()
        };
    }

    private ClassLessonResponse MapToLessonResponse(Lesson lesson, DateTime? scheduledDate, string lessonStatus)
    {
        return new ClassLessonResponse
        {
            Id = lesson.Id,
            Name = lesson.Name,
            OrderIndex = lesson.OrderIndex,
            ScheduledDate = scheduledDate,
            LessonStatus = string.IsNullOrWhiteSpace(lessonStatus)
                ? ClassLessonSchedule.PendingStatus
                : lessonStatus,
            Documents = lesson.Documents.Select(d => new DocumentResponse
            {
                Id = d.Id,
                Name = d.Name,
                Link = d.Link,
                PageRange = d.PageRange
            }).ToList(),
            Attachments = lesson.Attachments.Select(a => new AttachmentResponse
            {
                Id = a.Id,
                FileName = a.FileName,
                FileReference = a.FileReference,
                FileUrl = string.IsNullOrWhiteSpace(a.FileReference) ? null : _fileStorage.GetPublicUrl(a.FileReference),
                FileSize = a.FileSize
            }).ToList(),
            MiniGames = lesson.MiniGames.Select(mg => new MiniGameResponse
            {
                Id = mg.Id,
                Name = mg.Name,
                Description = mg.Description,
                Type = mg.Type,
                CreatedAt = mg.CreatedAt
            }).ToList()
        };
    }
}

public class ClassLessonPlanNotFoundException : Exception
{
    public ClassLessonPlanNotFoundException(string message) : base(message) { }
}
