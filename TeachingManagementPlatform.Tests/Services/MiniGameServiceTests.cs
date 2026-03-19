using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Tests.Services;

public class MiniGameServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly MiniGameService _service;
    private readonly FakeAIService _aiService;
    private readonly FakeFileStorage _fileStorage;
    private readonly int _lecturerId;
    private readonly int _lessonPlanId;

    public MiniGameServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"MiniGameTest_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _aiService = new FakeAIService();
        _fileStorage = new FakeFileStorage();
        _service = new MiniGameService(_context, _aiService, _fileStorage);

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

    private Lesson CreateLessonWithContent()
    {
        var lesson = new Lesson
        {
            LessonPlanId = _lessonPlanId,
            Name = "Bài 1",
            OrderIndex = 0
        };
        _context.Lessons.Add(lesson);
        _context.SaveChanges();

        _context.LessonDocuments.Add(new LessonDocument
        {
            LessonId = lesson.Id,
            Name = "Tài liệu 1",
            Link = "http://example.com/doc1",
            PageRange = "1-10"
        });
        _context.LessonAttachments.Add(new LessonAttachment
        {
            LessonId = lesson.Id,
            FileName = "notes.txt",
            FileReference = "ref_notes",
            FileSize = 256
        });
        _context.SaveChanges();
        return lesson;
    }

    private Lesson CreateEmptyLesson()
    {
        var lesson = new Lesson
        {
            LessonPlanId = _lessonPlanId,
            Name = "Bài trống",
            OrderIndex = 1
        };
        _context.Lessons.Add(lesson);
        _context.SaveChanges();
        return lesson;
    }

    // --- CreateAsync ---

    [Fact]
    public async Task CreateAsync_CreatesGameAndCallsAI()
    {
        var lesson = CreateLessonWithContent();
        var request = new CreateMiniGameRequest
        {
            Name = "Quiz Toán",
            Description = "Câu hỏi trắc nghiệm",
            GameType = "Quiz"
        };

        var result = await _service.CreateAsync(lesson.Id, _lecturerId, request);

        Assert.True(result.Id > 0);
        Assert.Equal("Quiz Toán", result.Name);
        Assert.Equal("Câu hỏi trắc nghiệm", result.Description);
        Assert.Equal("Quiz", result.Type);
        Assert.NotNull(result.Content);
        Assert.True(_aiService.WasCalled);
        Assert.Single(_aiService.ReceivedDocuments);
        Assert.Equal("Tài liệu 1", _aiService.ReceivedDocuments[0].Name);
        Assert.Single(_aiService.ReceivedAttachments);
        Assert.Equal("notes.txt", _aiService.ReceivedAttachments[0].FileName);
    }

    [Fact]
    public async Task CreateAsync_PersistsToDatabase()
    {
        var lesson = CreateLessonWithContent();
        var request = new CreateMiniGameRequest { Name = "Quiz DB", GameType = "Quiz" };

        var result = await _service.CreateAsync(lesson.Id, _lecturerId, request);

        var dbGame = await _context.MiniGames.FindAsync(result.Id);
        Assert.NotNull(dbGame);
        Assert.Equal("Quiz DB", dbGame!.Name);
        Assert.Equal("Quiz", dbGame.Type);
        Assert.NotNull(dbGame.Content);
    }

    [Fact]
    public async Task CreateAsync_WithEmptyLesson_StillCallsAI()
    {
        var lesson = CreateEmptyLesson();
        var request = new CreateMiniGameRequest { Name = "Quiz Empty", GameType = "Quiz" };

        var result = await _service.CreateAsync(lesson.Id, _lecturerId, request);

        Assert.True(result.Id > 0);
        Assert.True(_aiService.WasCalled);
        Assert.Empty(_aiService.ReceivedDocuments);
        Assert.Empty(_aiService.ReceivedAttachments);
    }

    [Fact]
    public async Task CreateAsync_Throws_WhenLessonNotFound()
    {
        var request = new CreateMiniGameRequest { Name = "X", GameType = "Quiz" };
        await Assert.ThrowsAsync<MiniGameNotFoundException>(
            () => _service.CreateAsync(999, _lecturerId, request));
    }

    [Fact]
    public async Task CreateAsync_Throws_WhenLessonBelongsToOtherLecturer()
    {
        var other = new User { Email = "other@test.com", FullName = "Other", Role = "Lecturer", Status = "Active", PasswordHash = "hash" };
        _context.Users.Add(other);
        await _context.SaveChangesAsync();

        var otherPlan = new LessonPlan { LecturerId = other.Id, Subject = "Lý", Grade = "11", SchoolYearStart = "2024", SchoolYearEnd = "2025", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.LessonPlans.Add(otherPlan);
        await _context.SaveChangesAsync();

        var otherLesson = new Lesson { LessonPlanId = otherPlan.Id, Name = "Other", OrderIndex = 0 };
        _context.Lessons.Add(otherLesson);
        await _context.SaveChangesAsync();

        var request = new CreateMiniGameRequest { Name = "X", GameType = "Quiz" };
        await Assert.ThrowsAsync<MiniGameNotFoundException>(
            () => _service.CreateAsync(otherLesson.Id, _lecturerId, request));
    }

    [Fact]
    public async Task CreateAsync_PropagatesAIServiceException()
    {
        var lesson = CreateLessonWithContent();
        _aiService.ShouldThrow = true;
        var request = new CreateMiniGameRequest { Name = "X", GameType = "Quiz" };

        var ex = await Assert.ThrowsAsync<AIServiceException>(
            () => _service.CreateAsync(lesson.Id, _lecturerId, request));
        Assert.Equal("Không thể tạo câu hỏi. Vui lòng thử lại.", ex.Message);
    }

    // --- GetByIdAsync ---

    [Fact]
    public async Task GetByIdAsync_ReturnsMiniGameDetail()
    {
        var lesson = CreateLessonWithContent();
        var game = new MiniGame
        {
            LessonId = lesson.Id,
            Name = "Quiz 1",
            Description = "Mô tả",
            Type = "Quiz",
            Content = JsonDocument.Parse("{\"questions\":[]}"),
            CreatedAt = DateTime.UtcNow
        };
        _context.MiniGames.Add(game);
        await _context.SaveChangesAsync();

        var result = await _service.GetByIdAsync(game.Id, _lecturerId);

        Assert.Equal(game.Id, result.Id);
        Assert.Equal("Quiz 1", result.Name);
        Assert.Equal("Mô tả", result.Description);
        Assert.Equal("Quiz", result.Type);
        Assert.NotNull(result.Content);
    }

    [Fact]
    public async Task GetByIdAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<MiniGameNotFoundException>(
            () => _service.GetByIdAsync(999, _lecturerId));
    }

    [Fact]
    public async Task GetByIdAsync_Throws_WhenBelongsToOtherLecturer()
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

        var game = new MiniGame { LessonId = otherLesson.Id, Name = "X", Type = "Quiz", CreatedAt = DateTime.UtcNow };
        _context.MiniGames.Add(game);
        await _context.SaveChangesAsync();

        await Assert.ThrowsAsync<MiniGameNotFoundException>(
            () => _service.GetByIdAsync(game.Id, _lecturerId));
    }

    // --- GetPlayDataAsync ---

    [Fact]
    public async Task GetPlayDataAsync_ReturnsPlayData()
    {
        var lesson = CreateLessonWithContent();
        var contentJson = "{\"questions\":[{\"question\":\"2+2?\",\"options\":[\"3\",\"4\",\"5\",\"6\"],\"correctAnswerIndex\":1}]}";
        var game = new MiniGame
        {
            LessonId = lesson.Id,
            Name = "Play Quiz",
            Type = "Quiz",
            Content = JsonDocument.Parse(contentJson),
            CreatedAt = DateTime.UtcNow
        };
        _context.MiniGames.Add(game);
        await _context.SaveChangesAsync();

        var result = await _service.GetPlayDataAsync(game.Id, _lecturerId);

        Assert.Equal(game.Id, result.Id);
        Assert.Equal("Play Quiz", result.Name);
        Assert.Equal("Quiz", result.Type);
        Assert.NotNull(result.Content);
    }

    [Fact]
    public async Task GetPlayDataAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<MiniGameNotFoundException>(
            () => _service.GetPlayDataAsync(999, _lecturerId));
    }

    // --- DeleteAsync ---

    [Fact]
    public async Task DeleteAsync_RemovesMiniGame()
    {
        var lesson = CreateLessonWithContent();
        var game = new MiniGame { LessonId = lesson.Id, Name = "To Delete", Type = "Quiz", CreatedAt = DateTime.UtcNow };
        _context.MiniGames.Add(game);
        await _context.SaveChangesAsync();

        await _service.DeleteAsync(game.Id, _lecturerId);

        Assert.Null(await _context.MiniGames.FindAsync(game.Id));
    }

    [Fact]
    public async Task DeleteAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<MiniGameNotFoundException>(
            () => _service.DeleteAsync(999, _lecturerId));
    }

    [Fact]
    public async Task DeleteAsync_Throws_WhenBelongsToOtherLecturer()
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

        var game = new MiniGame { LessonId = otherLesson.Id, Name = "X", Type = "Quiz", CreatedAt = DateTime.UtcNow };
        _context.MiniGames.Add(game);
        await _context.SaveChangesAsync();

        await Assert.ThrowsAsync<MiniGameNotFoundException>(
            () => _service.DeleteAsync(game.Id, _lecturerId));
    }
}


public class FakeAIService : IAIService
{
    public bool WasCalled { get; private set; }
    public bool ShouldThrow { get; set; }
    public List<DocumentInfo> ReceivedDocuments { get; private set; } = new();
    public List<AttachmentInfo> ReceivedAttachments { get; private set; } = new();

    public Task<QuizContent> GenerateQuizAsync(List<DocumentInfo> documents, List<AttachmentInfo> attachments)
    {
        WasCalled = true;
        ReceivedDocuments = documents;
        ReceivedAttachments = attachments;

        if (ShouldThrow)
            throw new AIServiceException("Không thể tạo câu hỏi. Vui lòng thử lại.");

        return Task.FromResult(new QuizContent
        {
            Questions = new List<QuizQuestion>
            {
                new()
                {
                    Question = "Câu hỏi mẫu?",
                    Options = new List<string> { "A", "B", "C", "D" },
                    CorrectAnswerIndex = 0
                }
            }
        });
    }
}
