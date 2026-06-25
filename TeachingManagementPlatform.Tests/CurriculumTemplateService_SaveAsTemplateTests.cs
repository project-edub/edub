using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Tests;

public class CurriculumTemplateService_SaveAsTemplateTests
{
    private static ApplicationDbContext CreateInMemoryContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: dbName)
            .Options;

        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task SaveAsTemplateAsync_HappyPath_CreatesTemplateWithCorrectLessons()
    {
        // Arrange
        var context = CreateInMemoryContext(nameof(SaveAsTemplateAsync_HappyPath_CreatesTemplateWithCorrectLessons));
        var service = new CurriculumTemplateService(context);

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
        context.LessonPlans.Add(lessonPlan);

        var lessons = new List<Lesson>
        {
            new Lesson { Id = 1, LessonPlanId = 1, Name = "Bài 1: Số hữu tỉ", OrderIndex = 0 },
            new Lesson { Id = 2, LessonPlanId = 1, Name = "Bài 2: Cộng trừ số hữu tỉ", OrderIndex = 1 },
            new Lesson { Id = 3, LessonPlanId = 1, Name = "Bài 3: Nhân chia số hữu tỉ", OrderIndex = 2 }
        };
        context.Lessons.AddRange(lessons);
        await context.SaveChangesAsync();

        var request = new SaveAsTemplateRequest
        {
            IsPublic = true,
            BookSet = "Kết nối tri thức",
            SourceNote = "Tự soạn từ giáo án thực tế"
        };

        // Act
        var result = await service.SaveAsTemplateAsync(lessonPlan.Id, lecturerId, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Toán", result.Subject);
        Assert.Equal(7, result.Grade);
        Assert.Equal("Kết nối tri thức", result.BookSet);
        Assert.Equal(lecturerId, result.CreatedBy);
        Assert.True(result.IsPublic);
        Assert.Equal("Tự soạn từ giáo án thực tế", result.SourceNote);
        Assert.Equal(0, result.UsageCount);
        Assert.Equal(3, result.LessonCount);

        // Verify template lessons in DB
        var templateLessons = await context.CurriculumTemplateLessons
            .Where(tl => tl.TemplateId == result.Id)
            .OrderBy(tl => tl.OrderIndex)
            .ToListAsync();

        Assert.Equal(3, templateLessons.Count);
        Assert.Equal("Bài 1: Số hữu tỉ", templateLessons[0].LessonName);
        Assert.Equal(0, templateLessons[0].OrderIndex);
        Assert.Equal("Bài 2: Cộng trừ số hữu tỉ", templateLessons[1].LessonName);
        Assert.Equal(1, templateLessons[1].OrderIndex);
        Assert.Equal("Bài 3: Nhân chia số hữu tỉ", templateLessons[2].LessonName);
        Assert.Equal(2, templateLessons[2].OrderIndex);
    }

    [Fact]
    public async Task SaveAsTemplateAsync_OnlyCopiesNameAndOrder_SuggestedPeriodsIsOne_NoDocumentsOrAttachments()
    {
        // Arrange
        var context = CreateInMemoryContext(nameof(SaveAsTemplateAsync_OnlyCopiesNameAndOrder_SuggestedPeriodsIsOne_NoDocumentsOrAttachments));
        var service = new CurriculumTemplateService(context);

        var lecturerId = 2;
        var lessonPlan = new LessonPlan
        {
            Id = 10,
            LecturerId = lecturerId,
            Subject = "Ngữ văn",
            Grade = "8",
            SchoolYearStart = "2025",
            SchoolYearEnd = "2026",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.LessonPlans.Add(lessonPlan);

        // Add lessons with documents and attachments
        var lesson1 = new Lesson { Id = 10, LessonPlanId = 10, Name = "Bài 1: Tôi đi học", OrderIndex = 0 };
        var lesson2 = new Lesson { Id = 11, LessonPlanId = 10, Name = "Bài 2: Trong lòng mẹ", OrderIndex = 1 };
        context.Lessons.AddRange(lesson1, lesson2);

        context.LessonDocuments.Add(new LessonDocument
        {
            Id = 1,
            LessonId = 10,
            Name = "Tài liệu bài 1",
            Link = "https://example.com/doc1"
        });

        context.LessonAttachments.Add(new LessonAttachment
        {
            Id = 1,
            LessonId = 10,
            FileName = "attachment.pdf",
            FileReference = "storage/attachment.pdf",
            FileSize = 1024
        });

        await context.SaveChangesAsync();

        var request = new SaveAsTemplateRequest
        {
            IsPublic = false,
            BookSet = null,
            SourceNote = null
        };

        // Act
        var result = await service.SaveAsTemplateAsync(lessonPlan.Id, lecturerId, request);

        // Assert — SuggestedPeriods is always 1 (hardcoded)
        var templateLessons = await context.CurriculumTemplateLessons
            .Where(tl => tl.TemplateId == result.Id)
            .OrderBy(tl => tl.OrderIndex)
            .ToListAsync();

        Assert.Equal(2, templateLessons.Count);
        foreach (var tl in templateLessons)
        {
            Assert.Equal(1, tl.SuggestedPeriods);
        }

        // Verify only name and orderIndex are copied
        Assert.Equal("Bài 1: Tôi đi học", templateLessons[0].LessonName);
        Assert.Equal(0, templateLessons[0].OrderIndex);
        Assert.Equal("Bài 2: Trong lòng mẹ", templateLessons[1].LessonName);
        Assert.Equal(1, templateLessons[1].OrderIndex);

        // Verify template does NOT have documents or attachments
        // CurriculumTemplateLesson entity has no Documents/Attachments navigation properties
        // This is by design — only name, orderIndex, and suggestedPeriods are stored
        var templateLessonType = typeof(CurriculumTemplateLesson);
        Assert.Null(templateLessonType.GetProperty("Documents"));
        Assert.Null(templateLessonType.GetProperty("Attachments"));
    }

    [Fact]
    public async Task SaveAsTemplateAsync_DifferentLecturerId_ThrowsException()
    {
        // Arrange
        var context = CreateInMemoryContext(nameof(SaveAsTemplateAsync_DifferentLecturerId_ThrowsException));
        var service = new CurriculumTemplateService(context);

        var ownerLecturerId = 5;
        var otherLecturerId = 99;

        var lessonPlan = new LessonPlan
        {
            Id = 20,
            LecturerId = ownerLecturerId,
            Subject = "Tiếng Anh",
            Grade = "9",
            SchoolYearStart = "2025",
            SchoolYearEnd = "2026",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        context.LessonPlans.Add(lessonPlan);

        context.Lessons.Add(new Lesson { Id = 20, LessonPlanId = 20, Name = "Unit 1", OrderIndex = 0 });
        await context.SaveChangesAsync();

        var request = new SaveAsTemplateRequest
        {
            IsPublic = true,
            BookSet = "Cánh diều",
            SourceNote = "Test"
        };

        // Act & Assert — different lecturer cannot save as template
        await Assert.ThrowsAsync<CurriculumTemplateNotFoundException>(
            () => service.SaveAsTemplateAsync(lessonPlan.Id, otherLecturerId, request));
    }
}
