using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Tests.Services;

public class CurriculumTemplateServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly CurriculumTemplateService _service;

    public CurriculumTemplateServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new ApplicationDbContext(options);
        _service = new CurriculumTemplateService(_context);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    [Fact]
    public async Task GenerateFromTemplateAsync_HappyPath_CreatesLessonsWithCorrectNamesAndOrder()
    {
        // Arrange
        var lecturerId = 1;
        var lessonPlan = new LessonPlan
        {
            Id = 1,
            LecturerId = lecturerId,
            Subject = "Toán",
            Grade = "7",
            SchoolYearStart = "2025",
            SchoolYearEnd = "2026",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.LessonPlans.Add(lessonPlan);

        var template = new CurriculumTemplate
        {
            Id = 1,
            Subject = "Toán",
            Grade = 7,
            IsPublic = true,
            UsageCount = 5,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        template.Lessons.Add(new CurriculumTemplateLesson
        {
            Id = 1,
            TemplateId = 1,
            OrderIndex = 1,
            LessonName = "Bài 1: Tập hợp số nguyên",
            ChapterName = "Chương 1",
            SuggestedPeriods = 2,
            CreatedAt = DateTime.UtcNow
        });
        template.Lessons.Add(new CurriculumTemplateLesson
        {
            Id = 2,
            TemplateId = 1,
            OrderIndex = 2,
            LessonName = "Bài 2: Cộng trừ số nguyên",
            ChapterName = "Chương 1",
            SuggestedPeriods = 1,
            CreatedAt = DateTime.UtcNow
        });
        template.Lessons.Add(new CurriculumTemplateLesson
        {
            Id = 3,
            TemplateId = 1,
            OrderIndex = 3,
            LessonName = "Bài 3: Nhân chia số nguyên",
            ChapterName = "Chương 1",
            SuggestedPeriods = 2,
            CreatedAt = DateTime.UtcNow
        });
        _context.CurriculumTemplates.Add(template);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GenerateFromTemplateAsync(
            lessonPlanId: lessonPlan.Id,
            templateId: template.Id,
            lecturerId: lecturerId);

        // Assert — 3 lessons generated
        Assert.Equal(3, result.Lessons.Count);

        // Assert — correct names
        Assert.Equal("Bài 1: Tập hợp số nguyên", result.Lessons[0].Name);
        Assert.Equal("Bài 2: Cộng trừ số nguyên", result.Lessons[1].Name);
        Assert.Equal("Bài 3: Nhân chia số nguyên", result.Lessons[2].Name);

        // Assert — correct order
        Assert.Equal(1, result.Lessons[0].OrderIndex);
        Assert.Equal(2, result.Lessons[1].OrderIndex);
        Assert.Equal(3, result.Lessons[2].OrderIndex);

        // Assert — UsageCount incremented
        var updatedTemplate = await _context.CurriculumTemplates.FindAsync(template.Id);
        Assert.Equal(6, updatedTemplate!.UsageCount);

        // Assert — lessons persisted to DB
        var dbLessons = await _context.Lessons
            .Where(l => l.LessonPlanId == lessonPlan.Id)
            .OrderBy(l => l.OrderIndex)
            .ToListAsync();
        Assert.Equal(3, dbLessons.Count);
        Assert.Equal("Bài 1: Tập hợp số nguyên", dbLessons[0].Name);
        Assert.Equal(1, dbLessons[0].OrderIndex);
    }

    [Fact]
    public async Task GenerateFromTemplateAsync_LecturerDoesNotOwnLessonPlan_ThrowsException()
    {
        // Arrange
        var ownerLecturerId = 1;
        var otherLecturerId = 2;

        var lessonPlan = new LessonPlan
        {
            Id = 1,
            LecturerId = ownerLecturerId,
            Subject = "Ngữ Văn",
            Grade = "7",
            SchoolYearStart = "2025",
            SchoolYearEnd = "2026",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.LessonPlans.Add(lessonPlan);

        var template = new CurriculumTemplate
        {
            Id = 1,
            Subject = "Ngữ Văn",
            Grade = 7,
            IsPublic = true,
            UsageCount = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.CurriculumTemplates.Add(template);
        await _context.SaveChangesAsync();

        // Act & Assert — another lecturer tries to generate from template
        await Assert.ThrowsAsync<CurriculumTemplateNotFoundException>(() =>
            _service.GenerateFromTemplateAsync(
                lessonPlanId: lessonPlan.Id,
                templateId: template.Id,
                lecturerId: otherLecturerId));

        // Assert — UsageCount not incremented
        var unchangedTemplate = await _context.CurriculumTemplates.FindAsync(template.Id);
        Assert.Equal(0, unchangedTemplate!.UsageCount);

        // Assert — no lessons created
        var lessons = await _context.Lessons.Where(l => l.LessonPlanId == lessonPlan.Id).ToListAsync();
        Assert.Empty(lessons);
    }
}
