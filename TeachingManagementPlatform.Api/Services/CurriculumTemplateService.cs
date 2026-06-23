using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

public class CurriculumTemplateService : ICurriculumTemplateService
{
    private readonly ApplicationDbContext _context;

    public CurriculumTemplateService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<CurriculumTemplateResponse>> GetTemplatesAsync(string? subject, int? grade)
    {
        var query = _context.CurriculumTemplates.AsQueryable();

        if (!string.IsNullOrWhiteSpace(subject))
            query = query.Where(ct => ct.Subject == subject);

        if (grade.HasValue && grade.Value > 0)
            query = query.Where(ct => ct.Grade == grade.Value);

        query = query.Where(ct => ct.CreatedBy == null || ct.IsPublic);

        return await query
            .OrderByDescending(ct => ct.UsageCount)
            .Select(ct => new CurriculumTemplateResponse
            {
                Id = ct.Id,
                Subject = ct.Subject,
                Grade = ct.Grade,
                BookSet = ct.BookSet,
                CreatedBy = ct.CreatedBy,
                IsPublic = ct.IsPublic,
                SourceNote = ct.SourceNote,
                UsageCount = ct.UsageCount,
                LessonCount = ct.Lessons.Count,
                CreatedAt = ct.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<List<CurriculumTemplateLessonResponse>> GetTemplateLessonsAsync(int templateId)
    {
        var templateExists = await _context.CurriculumTemplates.AnyAsync(ct => ct.Id == templateId);
        if (!templateExists)
            throw new CurriculumTemplateNotFoundException("Không tìm thấy khung chương trình");

        return await _context.CurriculumTemplateLessons
            .Where(ctl => ctl.TemplateId == templateId)
            .OrderBy(ctl => ctl.OrderIndex)
            .Select(ctl => new CurriculumTemplateLessonResponse
            {
                Id = ctl.Id,
                OrderIndex = ctl.OrderIndex,
                ChapterName = ctl.ChapterName,
                LessonName = ctl.LessonName,
                SuggestedPeriods = ctl.SuggestedPeriods
            })
            .ToListAsync();
    }

    public async Task<GenerateFromTemplateResponse> GenerateFromTemplateAsync(int lessonPlanId, int templateId, int lecturerId)
    {
        var lessonPlan = await _context.LessonPlans
            .FirstOrDefaultAsync(lp => lp.Id == lessonPlanId);

        if (lessonPlan == null || lessonPlan.LecturerId != lecturerId)
            throw new CurriculumTemplateNotFoundException("Không tìm thấy giáo án");

        var template = await _context.CurriculumTemplates
            .Include(ct => ct.Lessons.OrderBy(l => l.OrderIndex))
            .FirstOrDefaultAsync(ct => ct.Id == templateId);

        if (template == null)
            throw new CurriculumTemplateNotFoundException("Không tìm thấy khung chương trình");

        var lessons = template.Lessons.Select(tl => new Lesson
        {
            LessonPlanId = lessonPlanId,
            Name = tl.LessonName,
            OrderIndex = tl.OrderIndex
        }).ToList();

        _context.Lessons.AddRange(lessons);

        template.UsageCount++;
        template.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new GenerateFromTemplateResponse
        {
            Lessons = lessons.Select(l => new GeneratedLessonResponse
            {
                Id = l.Id,
                Name = l.Name,
                OrderIndex = l.OrderIndex
            }).ToList()
        };
    }

    public async Task<CurriculumTemplateResponse> SaveAsTemplateAsync(int lessonPlanId, int lecturerId, SaveAsTemplateRequest request)
    {
        var lessonPlan = await _context.LessonPlans
            .Include(lp => lp.Lessons.OrderBy(l => l.OrderIndex))
            .FirstOrDefaultAsync(lp => lp.Id == lessonPlanId);

        if (lessonPlan == null || lessonPlan.LecturerId != lecturerId)
            throw new CurriculumTemplateNotFoundException("Không tìm thấy giáo án");

        var template = new CurriculumTemplate
        {
            Subject = lessonPlan.Subject,
            Grade = int.TryParse(lessonPlan.Grade, out var g) ? g : 0,
            BookSet = request.BookSet,
            CreatedBy = lecturerId,
            IsPublic = request.IsPublic,
            SourceNote = request.SourceNote,
            UsageCount = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        foreach (var lesson in lessonPlan.Lessons)
        {
            template.Lessons.Add(new CurriculumTemplateLesson
            {
                LessonName = lesson.Name,
                OrderIndex = lesson.OrderIndex,
                SuggestedPeriods = 1,
                CreatedAt = DateTime.UtcNow
            });
        }

        _context.CurriculumTemplates.Add(template);
        await _context.SaveChangesAsync();

        return new CurriculumTemplateResponse
        {
            Id = template.Id,
            Subject = template.Subject,
            Grade = template.Grade,
            BookSet = template.BookSet,
            CreatedBy = template.CreatedBy,
            IsPublic = template.IsPublic,
            SourceNote = template.SourceNote,
            UsageCount = template.UsageCount,
            LessonCount = template.Lessons.Count,
            CreatedAt = template.CreatedAt
        };
    }

    public async Task<CurriculumTemplateResponse> CreateTemplateAsync(CreateCurriculumTemplateRequest request)
    {
        var template = new CurriculumTemplate
        {
            Subject = request.Subject,
            Grade = request.Grade,
            BookSet = request.BookSet,
            CreatedBy = null, // Admin-created = system template
            IsPublic = true,
            SourceNote = request.SourceNote,
            UsageCount = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        if (request.Lessons != null)
        {
            foreach (var l in request.Lessons)
            {
                template.Lessons.Add(new CurriculumTemplateLesson
                {
                    OrderIndex = l.OrderIndex,
                    ChapterName = l.ChapterName,
                    LessonName = l.LessonName,
                    SuggestedPeriods = l.SuggestedPeriods,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        _context.CurriculumTemplates.Add(template);
        await _context.SaveChangesAsync();

        return new CurriculumTemplateResponse
        {
            Id = template.Id,
            Subject = template.Subject,
            Grade = template.Grade,
            BookSet = template.BookSet,
            CreatedBy = template.CreatedBy,
            IsPublic = template.IsPublic,
            SourceNote = template.SourceNote,
            UsageCount = template.UsageCount,
            LessonCount = template.Lessons.Count,
            CreatedAt = template.CreatedAt
        };
    }

    public async Task<CurriculumTemplateResponse> UpdateTemplateAsync(int id, UpdateCurriculumTemplateRequest request)
    {
        var template = await _context.CurriculumTemplates
            .Include(ct => ct.Lessons)
            .FirstOrDefaultAsync(ct => ct.Id == id);

        if (template == null)
            throw new CurriculumTemplateNotFoundException("Không tìm thấy mẫu giáo án");

        if (request.Subject != null) template.Subject = request.Subject;
        if (request.Grade.HasValue) template.Grade = request.Grade.Value;
        if (request.BookSet != null) template.BookSet = request.BookSet;
        if (request.SourceNote != null) template.SourceNote = request.SourceNote;
        template.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new CurriculumTemplateResponse
        {
            Id = template.Id,
            Subject = template.Subject,
            Grade = template.Grade,
            BookSet = template.BookSet,
            CreatedBy = template.CreatedBy,
            IsPublic = template.IsPublic,
            SourceNote = template.SourceNote,
            UsageCount = template.UsageCount,
            LessonCount = template.Lessons.Count,
            CreatedAt = template.CreatedAt
        };
    }

    public async Task DeleteTemplateAsync(int id)
    {
        var template = await _context.CurriculumTemplates
            .Include(ct => ct.Lessons)
            .FirstOrDefaultAsync(ct => ct.Id == id);

        if (template == null)
            throw new CurriculumTemplateNotFoundException("Không tìm thấy mẫu giáo án");

        _context.CurriculumTemplateLessons.RemoveRange(template.Lessons);
        _context.CurriculumTemplates.Remove(template);
        await _context.SaveChangesAsync();
    }

    public async Task<List<CurriculumTemplateLessonResponse>> UpdateTemplateLessonsAsync(int templateId, UpdateTemplateLessonsRequest request)
    {
        var template = await _context.CurriculumTemplates
            .Include(ct => ct.Lessons)
            .FirstOrDefaultAsync(ct => ct.Id == templateId);

        if (template == null)
            throw new CurriculumTemplateNotFoundException("Không tìm thấy mẫu giáo án");

        // Remove all existing lessons
        _context.CurriculumTemplateLessons.RemoveRange(template.Lessons);

        // Add new lessons
        for (int i = 0; i < request.Lessons.Count; i++)
        {
            var l = request.Lessons[i];
            template.Lessons.Add(new CurriculumTemplateLesson
            {
                OrderIndex = i + 1,
                ChapterName = l.ChapterName,
                LessonName = l.LessonName,
                SuggestedPeriods = l.SuggestedPeriods,
                CreatedAt = DateTime.UtcNow
            });
        }

        template.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return template.Lessons
            .OrderBy(l => l.OrderIndex)
            .Select(l => new CurriculumTemplateLessonResponse
            {
                Id = l.Id,
                OrderIndex = l.OrderIndex,
                ChapterName = l.ChapterName,
                LessonName = l.LessonName,
                SuggestedPeriods = l.SuggestedPeriods
            })
            .ToList();
    }
}

public class CurriculumTemplateNotFoundException : Exception
{
    public CurriculumTemplateNotFoundException(string message) : base(message) { }
}
