using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Tests.Services;

public class ClassLessonPlanServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly ClassLessonPlanService _service;
    private readonly int _lecturerId;
    private readonly int _otherLecturerId;

    public ClassLessonPlanServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"ClassLessonPlanTest_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _service = new ClassLessonPlanService(_context);

        var lecturer = new User
        {
            Email = "lecturer@test.com",
            FullName = "Test Lecturer",
            Role = "Lecturer",
            Status = "Active",
            PasswordHash = "hash"
        };
        var otherLecturer = new User
        {
            Email = "other@test.com",
            FullName = "Other Lecturer",
            Role = "Lecturer",
            Status = "Active",
            PasswordHash = "hash"
        };
        _context.Users.AddRange(lecturer, otherLecturer);
        _context.SaveChanges();
        _lecturerId = lecturer.Id;
        _otherLecturerId = otherLecturer.Id;
    }

    public void Dispose() => _context.Dispose();

    private async Task<(Class cls, LessonPlan plan)> SeedClassAndPlan()
    {
        var plan = new LessonPlan
        {
            LecturerId = _lecturerId,
            Subject = "Toán",
            Grade = "10",
            SchoolYearStart = "2024",
            SchoolYearEnd = "2025",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        plan.Lessons.Add(new Lesson { Name = "Bài 1", OrderIndex = 0 });
        plan.Lessons.Add(new Lesson { Name = "Bài 2", OrderIndex = 1 });
        _context.LessonPlans.Add(plan);

        var cls = new Class
        {
            LecturerId = _lecturerId,
            Name = "Lớp 10A",
            Year = "2024",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Classes.Add(cls);
        await _context.SaveChangesAsync();
        return (cls, plan);
    }

    // --- AssignLessonPlanAsync ---

    [Fact]
    public async Task AssignLessonPlan_SetsAssignedPlanAndCreatesSchedules()
    {
        var (cls, plan) = await SeedClassAndPlan();

        var result = await _service.AssignLessonPlanAsync(cls.Id, _lecturerId, new AssignLessonPlanRequest { LessonPlanId = plan.Id });

        Assert.Equal(plan.Id, result.LessonPlanId);
        Assert.Equal("Toán", result.Subject);
        Assert.Equal(2, result.Lessons.Count);
        Assert.All(result.Lessons, l => Assert.Null(l.ScheduledDate));

        var updatedClass = await _context.Classes.FindAsync(cls.Id);
        Assert.Equal(plan.Id, updatedClass!.AssignedLessonPlanId);

        var schedules = await _context.ClassLessonSchedules.Where(s => s.ClassId == cls.Id).ToListAsync();
        Assert.Equal(2, schedules.Count);
    }

    [Fact]
    public async Task AssignLessonPlan_Throws_WhenClassNotFound()
    {
        var plan = new LessonPlan
        {
            LecturerId = _lecturerId, Subject = "X", Grade = "1",
            SchoolYearStart = "2024", SchoolYearEnd = "2025",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        _context.LessonPlans.Add(plan);
        await _context.SaveChangesAsync();

        await Assert.ThrowsAsync<ClassLessonPlanNotFoundException>(
            () => _service.AssignLessonPlanAsync(999, _lecturerId, new AssignLessonPlanRequest { LessonPlanId = plan.Id }));
    }

    [Fact]
    public async Task AssignLessonPlan_Throws_WhenPlanNotFound()
    {
        var cls = new Class { LecturerId = _lecturerId, Name = "C", Year = "2024", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.Classes.Add(cls);
        await _context.SaveChangesAsync();

        await Assert.ThrowsAsync<ClassLessonPlanNotFoundException>(
            () => _service.AssignLessonPlanAsync(cls.Id, _lecturerId, new AssignLessonPlanRequest { LessonPlanId = 999 }));
    }

    [Fact]
    public async Task AssignLessonPlan_Throws_WhenClassBelongsToOtherLecturer()
    {
        var (cls, plan) = await SeedClassAndPlan();

        await Assert.ThrowsAsync<ClassLessonPlanNotFoundException>(
            () => _service.AssignLessonPlanAsync(cls.Id, _otherLecturerId, new AssignLessonPlanRequest { LessonPlanId = plan.Id }));
    }

    [Fact]
    public async Task AssignLessonPlan_ReplacesOldSchedules_WhenReassigning()
    {
        var (cls, plan) = await SeedClassAndPlan();
        await _service.AssignLessonPlanAsync(cls.Id, _lecturerId, new AssignLessonPlanRequest { LessonPlanId = plan.Id });

        // Create a second plan
        var plan2 = new LessonPlan
        {
            LecturerId = _lecturerId, Subject = "Lý", Grade = "10",
            SchoolYearStart = "2024", SchoolYearEnd = "2025",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        plan2.Lessons.Add(new Lesson { Name = "Bài Lý 1", OrderIndex = 0 });
        _context.LessonPlans.Add(plan2);
        await _context.SaveChangesAsync();

        var result = await _service.AssignLessonPlanAsync(cls.Id, _lecturerId, new AssignLessonPlanRequest { LessonPlanId = plan2.Id });

        Assert.Equal(plan2.Id, result.LessonPlanId);
        Assert.Single(result.Lessons);

        var schedules = await _context.ClassLessonSchedules.Where(s => s.ClassId == cls.Id).ToListAsync();
        Assert.Single(schedules);
    }

    // --- GetAssignedPlanAsync ---

    [Fact]
    public async Task GetAssignedPlan_ReturnsNull_WhenNoPlanAssigned()
    {
        var cls = new Class { LecturerId = _lecturerId, Name = "Empty", Year = "2024", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.Classes.Add(cls);
        await _context.SaveChangesAsync();

        var result = await _service.GetAssignedPlanAsync(cls.Id, _lecturerId);
        Assert.Null(result);
    }

    [Fact]
    public async Task GetAssignedPlan_ReturnsPlanWithSchedules()
    {
        var (cls, plan) = await SeedClassAndPlan();
        await _service.AssignLessonPlanAsync(cls.Id, _lecturerId, new AssignLessonPlanRequest { LessonPlanId = plan.Id });

        var result = await _service.GetAssignedPlanAsync(cls.Id, _lecturerId);

        Assert.NotNull(result);
        Assert.Equal(plan.Id, result!.LessonPlanId);
        Assert.Equal(2, result.Lessons.Count);
    }

    [Fact]
    public async Task GetAssignedPlan_Throws_WhenClassNotFound()
    {
        await Assert.ThrowsAsync<ClassLessonPlanNotFoundException>(
            () => _service.GetAssignedPlanAsync(999, _lecturerId));
    }

    [Fact]
    public async Task GetAssignedPlan_Throws_WhenClassBelongsToOtherLecturer()
    {
        var (cls, _) = await SeedClassAndPlan();

        await Assert.ThrowsAsync<ClassLessonPlanNotFoundException>(
            () => _service.GetAssignedPlanAsync(cls.Id, _otherLecturerId));
    }

    // --- UpdateLessonScheduleAsync ---

    [Fact]
    public async Task UpdateLessonSchedule_UpdatesDate()
    {
        var (cls, plan) = await SeedClassAndPlan();
        await _service.AssignLessonPlanAsync(cls.Id, _lecturerId, new AssignLessonPlanRequest { LessonPlanId = plan.Id });

        var lessonId = plan.Lessons.First().Id;
        var date = new DateTime(2025, 3, 15);

        var result = await _service.UpdateLessonScheduleAsync(cls.Id, lessonId, _lecturerId, new UpdateLessonScheduleRequest { ScheduledDate = date });

        Assert.Equal(date, result.ScheduledDate);
        Assert.Equal("Bài 1", result.Name);
    }

    [Fact]
    public async Task UpdateLessonSchedule_ClearsDate_WhenNull()
    {
        var (cls, plan) = await SeedClassAndPlan();
        await _service.AssignLessonPlanAsync(cls.Id, _lecturerId, new AssignLessonPlanRequest { LessonPlanId = plan.Id });

        var lessonId = plan.Lessons.First().Id;
        await _service.UpdateLessonScheduleAsync(cls.Id, lessonId, _lecturerId, new UpdateLessonScheduleRequest { ScheduledDate = new DateTime(2025, 1, 1) });

        var result = await _service.UpdateLessonScheduleAsync(cls.Id, lessonId, _lecturerId, new UpdateLessonScheduleRequest { ScheduledDate = null });
        Assert.Null(result.ScheduledDate);
    }

    [Fact]
    public async Task UpdateLessonSchedule_Throws_WhenClassNotFound()
    {
        await Assert.ThrowsAsync<ClassLessonPlanNotFoundException>(
            () => _service.UpdateLessonScheduleAsync(999, 1, _lecturerId, new UpdateLessonScheduleRequest()));
    }

    [Fact]
    public async Task UpdateLessonSchedule_Throws_WhenNoPlanAssigned()
    {
        var cls = new Class { LecturerId = _lecturerId, Name = "No Plan", Year = "2024", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.Classes.Add(cls);
        await _context.SaveChangesAsync();

        await Assert.ThrowsAsync<ClassLessonPlanNotFoundException>(
            () => _service.UpdateLessonScheduleAsync(cls.Id, 1, _lecturerId, new UpdateLessonScheduleRequest()));
    }

    [Fact]
    public async Task UpdateLessonSchedule_Throws_WhenLessonNotInAssignedPlan()
    {
        var (cls, plan) = await SeedClassAndPlan();
        await _service.AssignLessonPlanAsync(cls.Id, _lecturerId, new AssignLessonPlanRequest { LessonPlanId = plan.Id });

        // Create a lesson in a different plan
        var otherPlan = new LessonPlan
        {
            LecturerId = _lecturerId, Subject = "Hóa", Grade = "10",
            SchoolYearStart = "2024", SchoolYearEnd = "2025",
            CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow
        };
        otherPlan.Lessons.Add(new Lesson { Name = "Other Lesson", OrderIndex = 0 });
        _context.LessonPlans.Add(otherPlan);
        await _context.SaveChangesAsync();

        var otherLessonId = otherPlan.Lessons.First().Id;

        await Assert.ThrowsAsync<ClassLessonPlanNotFoundException>(
            () => _service.UpdateLessonScheduleAsync(cls.Id, otherLessonId, _lecturerId, new UpdateLessonScheduleRequest { ScheduledDate = DateTime.UtcNow }));
    }

    [Fact]
    public async Task UpdateLessonSchedule_Throws_WhenClassBelongsToOtherLecturer()
    {
        var (cls, plan) = await SeedClassAndPlan();
        await _service.AssignLessonPlanAsync(cls.Id, _lecturerId, new AssignLessonPlanRequest { LessonPlanId = plan.Id });

        var lessonId = plan.Lessons.First().Id;

        await Assert.ThrowsAsync<ClassLessonPlanNotFoundException>(
            () => _service.UpdateLessonScheduleAsync(cls.Id, lessonId, _otherLecturerId, new UpdateLessonScheduleRequest { ScheduledDate = DateTime.UtcNow }));
    }

    // --- Lesson detail in response ---

    [Fact]
    public async Task GetAssignedPlan_IncludesDocumentsAttachmentsMiniGames()
    {
        var (cls, plan) = await SeedClassAndPlan();
        var lesson = plan.Lessons.First();

        _context.LessonDocuments.Add(new LessonDocument { LessonId = lesson.Id, Name = "Doc 1", Link = "http://example.com", PageRange = "1-5" });
        _context.LessonAttachments.Add(new LessonAttachment { LessonId = lesson.Id, FileName = "file.pdf", FileReference = "/files/file.pdf", FileSize = 1024 });
        _context.MiniGames.Add(new MiniGame { LessonId = lesson.Id, Name = "Quiz 1", Type = "Quiz", CreatedAt = DateTime.UtcNow });
        await _context.SaveChangesAsync();

        await _service.AssignLessonPlanAsync(cls.Id, _lecturerId, new AssignLessonPlanRequest { LessonPlanId = plan.Id });

        var result = await _service.GetAssignedPlanAsync(cls.Id, _lecturerId);

        var firstLesson = result!.Lessons.First(l => l.Id == lesson.Id);
        Assert.Single(firstLesson.Documents);
        Assert.Equal("Doc 1", firstLesson.Documents[0].Name);
        Assert.Single(firstLesson.Attachments);
        Assert.Equal("file.pdf", firstLesson.Attachments[0].FileName);
        Assert.Single(firstLesson.MiniGames);
        Assert.Equal("Quiz 1", firstLesson.MiniGames[0].Name);
    }
}
