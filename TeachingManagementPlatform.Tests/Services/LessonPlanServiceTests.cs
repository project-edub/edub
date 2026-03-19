using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Tests.Services;

public class LessonPlanServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly LessonPlanService _service;
    private readonly int _lecturerId;

    public LessonPlanServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"LessonPlanTest_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _service = new LessonPlanService(_context);

        var lecturer = new User
        {
            Email = "lecturer@test.com",
            FullName = "Test Lecturer",
            Role = "Lecturer",
            Status = "Active",
            PasswordHash = "hash"
        };
        _context.Users.Add(lecturer);
        _context.SaveChanges();
        _lecturerId = lecturer.Id;
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    // --- CreateAsync ---

    [Fact]
    public async Task CreateAsync_CreatesLessonPlan()
    {
        var request = new CreateLessonPlanRequest
        {
            Subject = "Toán",
            Grade = "10",
            SchoolYearStart = "2024",
            SchoolYearEnd = "2025",
            Lessons = new List<CreateLessonRequest>
            {
                new() { Name = "Bài 1", SortOrder = 0 },
                new() { Name = "Bài 2", SortOrder = 1 }
            }
        };

        var result = await _service.CreateAsync(_lecturerId, request);

        Assert.True(result.Id > 0);
        Assert.Equal("Toán", result.Subject);
        Assert.Equal("10", result.Grade);
        Assert.Equal("2024", result.SchoolYearStart);
        Assert.Equal("2025", result.SchoolYearEnd);
        Assert.Equal(2, result.Lessons.Count);
        Assert.Equal("Bài 1", result.Lessons[0].Name);
        Assert.Equal("Bài 2", result.Lessons[1].Name);
    }

    [Fact]
    public async Task CreateAsync_WithNoLessons_CreatesEmptyPlan()
    {
        var request = new CreateLessonPlanRequest
        {
            Subject = "Văn",
            Grade = "Đại học",
            SchoolYearStart = "2024",
            SchoolYearEnd = "2025"
        };

        var result = await _service.CreateAsync(_lecturerId, request);

        Assert.Equal("Văn", result.Subject);
        Assert.Equal("Đại học", result.Grade);
        Assert.Empty(result.Lessons);
    }

    // --- GetAllAsync ---

    [Fact]
    public async Task GetAllAsync_ReturnsOnlyLecturerPlans()
    {
        var other = new User { Email = "other@test.com", FullName = "Other", Role = "Lecturer", Status = "Active", PasswordHash = "hash" };
        _context.Users.Add(other);
        await _context.SaveChangesAsync();

        _context.LessonPlans.AddRange(
            new LessonPlan { LecturerId = _lecturerId, Subject = "Toán", Grade = "10", SchoolYearStart = "2024", SchoolYearEnd = "2025", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new LessonPlan { LecturerId = other.Id, Subject = "Lý", Grade = "11", SchoolYearStart = "2024", SchoolYearEnd = "2025", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();

        var result = await _service.GetAllAsync(_lecturerId);

        Assert.Single(result);
        Assert.Equal("Toán", result[0].Subject);
    }

    [Fact]
    public async Task GetAllAsync_ReturnsEmptyList_WhenNoPlans()
    {
        var result = await _service.GetAllAsync(_lecturerId);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetAllAsync_FiltersByGrade()
    {
        _context.LessonPlans.AddRange(
            new LessonPlan { LecturerId = _lecturerId, Subject = "Toán", Grade = "10", SchoolYearStart = "2024", SchoolYearEnd = "2025", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new LessonPlan { LecturerId = _lecturerId, Subject = "Toán", Grade = "11", SchoolYearStart = "2024", SchoolYearEnd = "2025", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();

        var result = await _service.GetAllAsync(_lecturerId, grade: "10");

        Assert.Single(result);
        Assert.Equal("10", result[0].Grade);
    }

    [Fact]
    public async Task GetAllAsync_FiltersBySubject()
    {
        _context.LessonPlans.AddRange(
            new LessonPlan { LecturerId = _lecturerId, Subject = "Toán học", Grade = "10", SchoolYearStart = "2024", SchoolYearEnd = "2025", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new LessonPlan { LecturerId = _lecturerId, Subject = "Vật lý", Grade = "10", SchoolYearStart = "2024", SchoolYearEnd = "2025", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();

        var result = await _service.GetAllAsync(_lecturerId, subject: "Toán");

        Assert.Single(result);
        Assert.Equal("Toán học", result[0].Subject);
    }

    [Fact]
    public async Task GetAllAsync_FiltersBySchoolYear()
    {
        _context.LessonPlans.AddRange(
            new LessonPlan { LecturerId = _lecturerId, Subject = "Toán", Grade = "10", SchoolYearStart = "2024", SchoolYearEnd = "2025", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new LessonPlan { LecturerId = _lecturerId, Subject = "Toán", Grade = "10", SchoolYearStart = "2023", SchoolYearEnd = "2024", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();

        var result = await _service.GetAllAsync(_lecturerId, schoolYear: "2025");

        Assert.Single(result);
        Assert.Equal("2025", result[0].SchoolYearEnd);
    }

    [Fact]
    public async Task GetAllAsync_IncludesLessonsOrderedBySortOrder()
    {
        var plan = new LessonPlan { LecturerId = _lecturerId, Subject = "Toán", Grade = "10", SchoolYearStart = "2024", SchoolYearEnd = "2025", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.LessonPlans.Add(plan);
        await _context.SaveChangesAsync();

        _context.Lessons.AddRange(
            new Lesson { LessonPlanId = plan.Id, Name = "Bài 2", OrderIndex = 1 },
            new Lesson { LessonPlanId = plan.Id, Name = "Bài 1", OrderIndex = 0 }
        );
        await _context.SaveChangesAsync();

        var result = await _service.GetAllAsync(_lecturerId);

        Assert.Equal(2, result[0].Lessons.Count);
        Assert.Equal("Bài 1", result[0].Lessons[0].Name);
        Assert.Equal("Bài 2", result[0].Lessons[1].Name);
    }

    // --- GetByIdAsync ---

    [Fact]
    public async Task GetByIdAsync_ReturnsPlanWithLessons()
    {
        var plan = new LessonPlan { LecturerId = _lecturerId, Subject = "Toán", Grade = "10", SchoolYearStart = "2024", SchoolYearEnd = "2025", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.LessonPlans.Add(plan);
        await _context.SaveChangesAsync();

        _context.Lessons.Add(new Lesson { LessonPlanId = plan.Id, Name = "Bài 1", OrderIndex = 0 });
        await _context.SaveChangesAsync();

        var result = await _service.GetByIdAsync(plan.Id, _lecturerId);

        Assert.Equal("Toán", result.Subject);
        Assert.Single(result.Lessons);
        Assert.Equal("Bài 1", result.Lessons[0].Name);
    }

    [Fact]
    public async Task GetByIdAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<LessonPlanNotFoundException>(() => _service.GetByIdAsync(999, _lecturerId));
    }

    [Fact]
    public async Task GetByIdAsync_Throws_WhenBelongsToOtherLecturer()
    {
        var other = new User { Email = "other2@test.com", FullName = "Other", Role = "Lecturer", Status = "Active", PasswordHash = "hash" };
        _context.Users.Add(other);
        var plan = new LessonPlan { LecturerId = other.Id, Subject = "Toán", Grade = "10", SchoolYearStart = "2024", SchoolYearEnd = "2025", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.LessonPlans.Add(plan);
        await _context.SaveChangesAsync();

        await Assert.ThrowsAsync<LessonPlanNotFoundException>(() => _service.GetByIdAsync(plan.Id, _lecturerId));
    }

    // --- UpdateAsync ---

    [Fact]
    public async Task UpdateAsync_UpdatesSubject()
    {
        var plan = new LessonPlan { LecturerId = _lecturerId, Subject = "Toán", Grade = "10", SchoolYearStart = "2024", SchoolYearEnd = "2025", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.LessonPlans.Add(plan);
        await _context.SaveChangesAsync();

        var result = await _service.UpdateAsync(plan.Id, _lecturerId, new UpdateLessonPlanRequest { Subject = "Lý" });

        Assert.Equal("Lý", result.Subject);
        Assert.Equal("10", result.Grade);
    }

    [Fact]
    public async Task UpdateAsync_ReplacesAllLessons()
    {
        var plan = new LessonPlan { LecturerId = _lecturerId, Subject = "Toán", Grade = "10", SchoolYearStart = "2024", SchoolYearEnd = "2025", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.LessonPlans.Add(plan);
        await _context.SaveChangesAsync();

        _context.Lessons.Add(new Lesson { LessonPlanId = plan.Id, Name = "Old Lesson", OrderIndex = 0 });
        await _context.SaveChangesAsync();

        var result = await _service.UpdateAsync(plan.Id, _lecturerId, new UpdateLessonPlanRequest
        {
            Lessons = new List<UpdateLessonRequest>
            {
                new() { Name = "New Lesson 1", SortOrder = 0 },
                new() { Name = "New Lesson 2", SortOrder = 1 }
            }
        });

        Assert.Equal(2, result.Lessons.Count);
        Assert.Equal("New Lesson 1", result.Lessons[0].Name);
        Assert.Equal("New Lesson 2", result.Lessons[1].Name);

        // Old lesson should be gone
        var allLessons = await _context.Lessons.Where(l => l.LessonPlanId == plan.Id).ToListAsync();
        Assert.Equal(2, allLessons.Count);
    }

    [Fact]
    public async Task UpdateAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<LessonPlanNotFoundException>(
            () => _service.UpdateAsync(999, _lecturerId, new UpdateLessonPlanRequest { Subject = "X" }));
    }

    [Fact]
    public async Task UpdateAsync_DoesNotReplaceLessons_WhenLessonsNull()
    {
        var plan = new LessonPlan { LecturerId = _lecturerId, Subject = "Toán", Grade = "10", SchoolYearStart = "2024", SchoolYearEnd = "2025", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.LessonPlans.Add(plan);
        await _context.SaveChangesAsync();

        _context.Lessons.Add(new Lesson { LessonPlanId = plan.Id, Name = "Keep Me", OrderIndex = 0 });
        await _context.SaveChangesAsync();

        var result = await _service.UpdateAsync(plan.Id, _lecturerId, new UpdateLessonPlanRequest { Subject = "Lý" });

        Assert.Single(result.Lessons);
        Assert.Equal("Keep Me", result.Lessons[0].Name);
    }

    // --- DeleteAsync ---

    [Fact]
    public async Task DeleteAsync_RemovesPlan()
    {
        var plan = new LessonPlan { LecturerId = _lecturerId, Subject = "Toán", Grade = "10", SchoolYearStart = "2024", SchoolYearEnd = "2025", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.LessonPlans.Add(plan);
        await _context.SaveChangesAsync();

        await _service.DeleteAsync(plan.Id, _lecturerId);

        Assert.Null(await _context.LessonPlans.FindAsync(plan.Id));
    }

    [Fact]
    public async Task DeleteAsync_CascadeDeletesLessons()
    {
        var plan = new LessonPlan { LecturerId = _lecturerId, Subject = "Toán", Grade = "10", SchoolYearStart = "2024", SchoolYearEnd = "2025", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.LessonPlans.Add(plan);
        await _context.SaveChangesAsync();

        _context.Lessons.Add(new Lesson { LessonPlanId = plan.Id, Name = "Bài 1", OrderIndex = 0 });
        await _context.SaveChangesAsync();

        await _service.DeleteAsync(plan.Id, _lecturerId);

        Assert.Empty(await _context.Lessons.Where(l => l.LessonPlanId == plan.Id).ToListAsync());
    }

    [Fact]
    public async Task DeleteAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<LessonPlanNotFoundException>(() => _service.DeleteAsync(999, _lecturerId));
    }

    [Fact]
    public async Task DeleteAsync_RemovedPlanNotInGetAll()
    {
        var plan = new LessonPlan { LecturerId = _lecturerId, Subject = "Toán", Grade = "10", SchoolYearStart = "2024", SchoolYearEnd = "2025", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.LessonPlans.Add(plan);
        await _context.SaveChangesAsync();

        await _service.DeleteAsync(plan.Id, _lecturerId);

        var all = await _service.GetAllAsync(_lecturerId);
        Assert.Empty(all);
    }

    // --- Grade values ---

    [Theory]
    [InlineData("1")]
    [InlineData("6")]
    [InlineData("12")]
    [InlineData("Đại học")]
    public async Task CreateAsync_AcceptsValidGradeValues(string grade)
    {
        var request = new CreateLessonPlanRequest
        {
            Subject = "Toán",
            Grade = grade,
            SchoolYearStart = "2024",
            SchoolYearEnd = "2025"
        };

        var result = await _service.CreateAsync(_lecturerId, request);

        Assert.Equal(grade, result.Grade);
    }
}
