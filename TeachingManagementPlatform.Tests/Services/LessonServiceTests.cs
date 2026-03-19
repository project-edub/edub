using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Tests.Services;

public class LessonServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly LessonService _service;
    private readonly FakeFileStorage _fileStorage;
    private readonly int _lecturerId;
    private readonly int _lessonPlanId;

    public LessonServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"LessonTest_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _fileStorage = new FakeFileStorage();
        _service = new LessonService(_context, _fileStorage);

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
        _context.LessonPlans.Add(plan);
        _context.SaveChanges();
        _lessonPlanId = plan.Id;
    }

    public void Dispose() => _context.Dispose();

    private Lesson CreateLesson(string name = "Bài 1", int orderIndex = 0)
    {
        var lesson = new Lesson
        {
            LessonPlanId = _lessonPlanId,
            Name = name,
            OrderIndex = orderIndex
        };
        _context.Lessons.Add(lesson);
        _context.SaveChanges();
        return lesson;
    }

    // --- GetByIdAsync ---

    [Fact]
    public async Task GetByIdAsync_ReturnsLessonDetail()
    {
        var lesson = CreateLesson();
        _context.LessonDocuments.Add(new LessonDocument { LessonId = lesson.Id, Name = "Doc1", Link = "http://link.com", PageRange = "1-5" });
        _context.LessonAttachments.Add(new LessonAttachment { LessonId = lesson.Id, FileName = "file.pdf", FileReference = "ref1", FileSize = 1024 });
        _context.MiniGames.Add(new MiniGame { LessonId = lesson.Id, Name = "Quiz 1", Type = "Quiz", CreatedAt = DateTime.UtcNow });
        await _context.SaveChangesAsync();

        var result = await _service.GetByIdAsync(lesson.Id, _lecturerId);

        Assert.Equal(lesson.Id, result.Id);
        Assert.Equal("Bài 1", result.Name);
        Assert.Single(result.Documents);
        Assert.Equal("Doc1", result.Documents[0].Name);
        Assert.Equal("http://link.com", result.Documents[0].Link);
        Assert.Equal("1-5", result.Documents[0].PageRange);
        Assert.Single(result.Attachments);
        Assert.Equal("file.pdf", result.Attachments[0].FileName);
        Assert.Single(result.MiniGames);
        Assert.Equal("Quiz 1", result.MiniGames[0].Name);
    }

    [Fact]
    public async Task GetByIdAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<LessonNotFoundException>(() => _service.GetByIdAsync(999, _lecturerId));
    }

    [Fact]
    public async Task GetByIdAsync_Throws_WhenBelongsToOtherLecturer()
    {
        var other = new User { Email = "other@test.com", FullName = "Other", Role = "Lecturer", Status = "Active", PasswordHash = "hash" };
        _context.Users.Add(other);
        await _context.SaveChangesAsync();

        var otherPlan = new LessonPlan { LecturerId = other.Id, Subject = "Lý", Grade = "11", SchoolYearStart = "2024", SchoolYearEnd = "2025", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.LessonPlans.Add(otherPlan);
        await _context.SaveChangesAsync();

        var lesson = new Lesson { LessonPlanId = otherPlan.Id, Name = "Other Lesson", OrderIndex = 0 };
        _context.Lessons.Add(lesson);
        await _context.SaveChangesAsync();

        await Assert.ThrowsAsync<LessonNotFoundException>(() => _service.GetByIdAsync(lesson.Id, _lecturerId));
    }

    // --- UpdateNameAsync ---

    [Fact]
    public async Task UpdateNameAsync_UpdatesLessonName()
    {
        var lesson = CreateLesson("Old Name");

        var result = await _service.UpdateNameAsync(lesson.Id, _lecturerId, new UpdateLessonNameRequest { Name = "New Name" });

        Assert.Equal("New Name", result.Name);
        var dbLesson = await _context.Lessons.FindAsync(lesson.Id);
        Assert.Equal("New Name", dbLesson!.Name);
    }

    [Fact]
    public async Task UpdateNameAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<LessonNotFoundException>(
            () => _service.UpdateNameAsync(999, _lecturerId, new UpdateLessonNameRequest { Name = "X" }));
    }

    // --- AddDocumentAsync ---

    [Fact]
    public async Task AddDocumentAsync_AddsDocument()
    {
        var lesson = CreateLesson();

        var result = await _service.AddDocumentAsync(lesson.Id, _lecturerId, new CreateDocumentRequest
        {
            Name = "Tài liệu 1",
            Link = "http://example.com/doc",
            PageRange = "10-20"
        });

        Assert.True(result.Id > 0);
        Assert.Equal("Tài liệu 1", result.Name);
        Assert.Equal("http://example.com/doc", result.Link);
        Assert.Equal("10-20", result.PageRange);
    }

    [Fact]
    public async Task AddDocumentAsync_WithNullPageRange()
    {
        var lesson = CreateLesson();

        var result = await _service.AddDocumentAsync(lesson.Id, _lecturerId, new CreateDocumentRequest
        {
            Name = "Doc",
            Link = "http://link.com"
        });

        Assert.Null(result.PageRange);
    }

    [Fact]
    public async Task AddDocumentAsync_Throws_WhenLessonNotFound()
    {
        await Assert.ThrowsAsync<LessonNotFoundException>(
            () => _service.AddDocumentAsync(999, _lecturerId, new CreateDocumentRequest { Name = "X", Link = "http://x.com" }));
    }

    // --- UpdateDocumentAsync ---

    [Fact]
    public async Task UpdateDocumentAsync_UpdatesDocument()
    {
        var lesson = CreateLesson();
        var doc = new LessonDocument { LessonId = lesson.Id, Name = "Old", Link = "http://old.com", PageRange = "1-5" };
        _context.LessonDocuments.Add(doc);
        await _context.SaveChangesAsync();

        var result = await _service.UpdateDocumentAsync(doc.Id, _lecturerId, new UpdateDocumentRequest
        {
            Name = "Updated",
            Link = "http://new.com",
            PageRange = "10-20"
        });

        Assert.Equal("Updated", result.Name);
        Assert.Equal("http://new.com", result.Link);
        Assert.Equal("10-20", result.PageRange);
    }

    [Fact]
    public async Task UpdateDocumentAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<LessonNotFoundException>(
            () => _service.UpdateDocumentAsync(999, _lecturerId, new UpdateDocumentRequest { Name = "X", Link = "http://x.com" }));
    }

    [Fact]
    public async Task UpdateDocumentAsync_Throws_WhenBelongsToOtherLecturer()
    {
        var other = new User { Email = "other2@test.com", FullName = "Other", Role = "Lecturer", Status = "Active", PasswordHash = "hash" };
        _context.Users.Add(other);
        await _context.SaveChangesAsync();

        var otherPlan = new LessonPlan { LecturerId = other.Id, Subject = "Lý", Grade = "11", SchoolYearStart = "2024", SchoolYearEnd = "2025", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.LessonPlans.Add(otherPlan);
        await _context.SaveChangesAsync();

        var otherLesson = new Lesson { LessonPlanId = otherPlan.Id, Name = "Other", OrderIndex = 0 };
        _context.Lessons.Add(otherLesson);
        await _context.SaveChangesAsync();

        var doc = new LessonDocument { LessonId = otherLesson.Id, Name = "Doc", Link = "http://x.com" };
        _context.LessonDocuments.Add(doc);
        await _context.SaveChangesAsync();

        await Assert.ThrowsAsync<LessonNotFoundException>(
            () => _service.UpdateDocumentAsync(doc.Id, _lecturerId, new UpdateDocumentRequest { Name = "X", Link = "http://x.com" }));
    }

    // --- DeleteDocumentAsync ---

    [Fact]
    public async Task DeleteDocumentAsync_RemovesDocument()
    {
        var lesson = CreateLesson();
        var doc = new LessonDocument { LessonId = lesson.Id, Name = "Doc", Link = "http://x.com" };
        _context.LessonDocuments.Add(doc);
        await _context.SaveChangesAsync();

        await _service.DeleteDocumentAsync(doc.Id, _lecturerId);

        Assert.Null(await _context.LessonDocuments.FindAsync(doc.Id));
    }

    [Fact]
    public async Task DeleteDocumentAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<LessonNotFoundException>(() => _service.DeleteDocumentAsync(999, _lecturerId));
    }

    // --- AddAttachmentAsync ---

    [Fact]
    public async Task AddAttachmentAsync_SavesFileAndCreatesRecord()
    {
        var lesson = CreateLesson();
        using var stream = new MemoryStream(new byte[] { 1, 2, 3 });

        var result = await _service.AddAttachmentAsync(lesson.Id, _lecturerId, stream, "test.pdf", 3);

        Assert.True(result.Id > 0);
        Assert.Equal("test.pdf", result.FileName);
        Assert.Equal(3, result.FileSize);
        Assert.NotEmpty(result.FileReference);
        Assert.Single(_fileStorage.SavedFiles);
    }

    [Fact]
    public async Task AddAttachmentAsync_Throws_WhenLessonNotFound()
    {
        using var stream = new MemoryStream(new byte[] { 1 });
        await Assert.ThrowsAsync<LessonNotFoundException>(
            () => _service.AddAttachmentAsync(999, _lecturerId, stream, "test.pdf", 1));
    }

    // --- DeleteAttachmentAsync ---

    [Fact]
    public async Task DeleteAttachmentAsync_RemovesAttachmentAndFile()
    {
        var lesson = CreateLesson();
        var attachment = new LessonAttachment { LessonId = lesson.Id, FileName = "file.pdf", FileReference = "ref123", FileSize = 100 };
        _context.LessonAttachments.Add(attachment);
        await _context.SaveChangesAsync();

        await _service.DeleteAttachmentAsync(attachment.Id, _lecturerId);

        Assert.Null(await _context.LessonAttachments.FindAsync(attachment.Id));
        Assert.Contains("ref123", _fileStorage.DeletedFiles);
    }

    [Fact]
    public async Task DeleteAttachmentAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<LessonNotFoundException>(() => _service.DeleteAttachmentAsync(999, _lecturerId));
    }

    // --- Ownership verification across operations ---

    [Fact]
    public async Task AddDocumentAsync_Throws_WhenLessonBelongsToOtherLecturer()
    {
        var other = new User { Email = "other3@test.com", FullName = "Other", Role = "Lecturer", Status = "Active", PasswordHash = "hash" };
        _context.Users.Add(other);
        await _context.SaveChangesAsync();

        var otherPlan = new LessonPlan { LecturerId = other.Id, Subject = "Lý", Grade = "11", SchoolYearStart = "2024", SchoolYearEnd = "2025", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.LessonPlans.Add(otherPlan);
        await _context.SaveChangesAsync();

        var otherLesson = new Lesson { LessonPlanId = otherPlan.Id, Name = "Other", OrderIndex = 0 };
        _context.Lessons.Add(otherLesson);
        await _context.SaveChangesAsync();

        await Assert.ThrowsAsync<LessonNotFoundException>(
            () => _service.AddDocumentAsync(otherLesson.Id, _lecturerId, new CreateDocumentRequest { Name = "X", Link = "http://x.com" }));
    }
}

// Fake file storage for testing
public class FakeFileStorage : IFileStorage
{
    public List<string> SavedFiles { get; } = new();
    public List<string> DeletedFiles { get; } = new();

    public Task<string> SaveFileAsync(Stream fileStream, string fileName)
    {
        var reference = $"fake_{Guid.NewGuid()}_{fileName}";
        SavedFiles.Add(reference);
        return Task.FromResult(reference);
    }

    public Task<Stream> GetFileAsync(string fileReference)
    {
        return Task.FromResult<Stream>(new MemoryStream(new byte[] { 1, 2, 3 }));
    }

    public Task DeleteFileAsync(string fileReference)
    {
        DeletedFiles.Add(fileReference);
        return Task.CompletedTask;
    }

    public Task<FileMetadata> GetMetadataAsync(string fileReference)
    {
        return Task.FromResult(new FileMetadata
        {
            Name = "test.pdf",
            Size = 100,
            ModifiedAt = DateTime.UtcNow
        });
    }
}
