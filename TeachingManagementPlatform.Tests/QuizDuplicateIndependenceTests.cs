using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TeachingManagementPlatform.Api.Controllers;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Tests;

/// <summary>
/// Integration tests verifying that duplicated quizzes are fully independent
/// from the original — edits, deletes, and ID assignments do not cross-contaminate.
/// </summary>
public class QuizDuplicateIndependenceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly QuizGameController _controller;
    private const int TestUserId = 1;

    public QuizDuplicateIndependenceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new ApplicationDbContext(options);

        // Seed user
        _context.Users.Add(new User
        {
            Id = TestUserId,
            Email = "test@test.com",
            FullName = "Test User",
            PasswordHash = "hash",
            Role = "Lecturer",
            Status = "Active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });
        _context.SaveChanges();

        // Create controller with mocked user identity
        _controller = new QuizGameController(
            _context,
            new LoggerFactory().CreateLogger<QuizGameController>());

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext
            {
                User = new ClaimsPrincipal(new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.NameIdentifier, TestUserId.ToString())
                }, "test"))
            }
        };
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    /// <summary>
    /// After duplication, the copy has a different ID and a different slug from the original.
    /// </summary>
    [Fact]
    public async Task DuplicatedQuiz_HasDifferentId_And_Slug()
    {
        // Arrange
        var original = await SeedQuizWithQuestions("Quiz gốc", 3);

        // Act
        var result = await _controller.Duplicate(original.Id);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var data = GetAnonymousProperties(okResult.Value!, "gameId", "slug");
        var duplicateId = (int)data["gameId"];
        var duplicateSlug = (string)data["slug"];

        Assert.NotEqual(original.Id, duplicateId);
        Assert.NotEqual(original.Slug, duplicateSlug);
    }

    /// <summary>
    /// After duplicating, modify the duplicate's title and a question's text,
    /// then verify the original quiz still has its original title and question text unchanged.
    /// </summary>
    [Fact]
    public async Task EditingDuplicate_DoesNotAffectOriginal()
    {
        // Arrange
        var original = await SeedQuizWithQuestions("Quiz gốc", 2);
        var originalQuestionText = original.Questions.First().QuestionText;

        // Act — duplicate
        var dupResult = await _controller.Duplicate(original.Id);
        var okResult = Assert.IsType<OkObjectResult>(dupResult);
        var data = GetAnonymousProperties(okResult.Value!, "gameId", "slug");
        var duplicateId = (int)data["gameId"];

        // Modify the duplicate's title and first question
        var duplicate = await _context.QuizGames
            .Include(q => q.Questions)
            .FirstAsync(q => q.Id == duplicateId);

        duplicate.Title = "Tiêu đề đã sửa";
        duplicate.Questions.First().QuestionText = "Câu hỏi đã sửa";
        await _context.SaveChangesAsync();

        // Assert — reload the original and verify it's unchanged
        var reloadedOriginal = await _context.QuizGames
            .Include(q => q.Questions)
            .FirstAsync(q => q.Id == original.Id);

        Assert.Equal("Quiz gốc", reloadedOriginal.Title);
        Assert.Equal(originalQuestionText, reloadedOriginal.Questions.First().QuestionText);
    }

    /// <summary>
    /// After duplicating, delete the duplicate, verify the original quiz
    /// and all its questions still exist.
    /// </summary>
    [Fact]
    public async Task DeletingDuplicate_DoesNotAffectOriginal()
    {
        // Arrange
        var original = await SeedQuizWithQuestions("Quiz gốc", 3);
        var originalQuestionCount = original.Questions.Count;

        // Act — duplicate then delete the duplicate
        var dupResult = await _controller.Duplicate(original.Id);
        var okResult = Assert.IsType<OkObjectResult>(dupResult);
        var data = GetAnonymousProperties(okResult.Value!, "gameId", "slug");
        var duplicateId = (int)data["gameId"];

        var deleteResult = await _controller.Delete(duplicateId);
        Assert.IsType<NoContentResult>(deleteResult);

        // Assert — original still exists with all questions
        var reloadedOriginal = await _context.QuizGames
            .Include(q => q.Questions)
            .FirstOrDefaultAsync(q => q.Id == original.Id);

        Assert.NotNull(reloadedOriginal);
        Assert.Equal(originalQuestionCount, reloadedOriginal.Questions.Count);
        Assert.Equal("Quiz gốc", reloadedOriginal.Title);
    }

    /// <summary>
    /// Verify that each duplicated question has its own ID (different from original
    /// question IDs) but the same content (questionText, optionsJson, correctAnswerIndex,
    /// explanation, difficulty).
    /// </summary>
    [Fact]
    public async Task DuplicatedQuestions_AreIndependent()
    {
        // Arrange
        var original = await SeedQuizWithQuestions("Quiz gốc", 4);
        var originalQuestions = original.Questions.OrderBy(q => q.Number).ToList();

        // Act
        var dupResult = await _controller.Duplicate(original.Id);
        var okResult = Assert.IsType<OkObjectResult>(dupResult);
        var data = GetAnonymousProperties(okResult.Value!, "gameId", "slug");
        var duplicateId = (int)data["gameId"];

        var duplicateQuestions = await _context.QuizGameQuestions
            .Where(q => q.QuizGameId == duplicateId)
            .OrderBy(q => q.Number)
            .ToListAsync();

        // Assert — same count
        Assert.Equal(originalQuestions.Count, duplicateQuestions.Count);

        for (int i = 0; i < originalQuestions.Count; i++)
        {
            var orig = originalQuestions[i];
            var dup = duplicateQuestions[i];

            // IDs are different
            Assert.NotEqual(orig.Id, dup.Id);

            // Content is the same
            Assert.Equal(orig.QuestionText, dup.QuestionText);
            Assert.Equal(orig.OptionsJson, dup.OptionsJson);
            Assert.Equal(orig.CorrectAnswerIndex, dup.CorrectAnswerIndex);
            Assert.Equal(orig.Explanation, dup.Explanation);
            Assert.Equal(orig.Difficulty, dup.Difficulty);
        }
    }

    // ── Helpers ──

    private async Task<QuizGame> SeedQuizWithQuestions(string title, int questionCount)
    {
        var game = new QuizGame
        {
            UserId = TestUserId,
            Title = title,
            Status = "published",
            Slug = $"slug-{Guid.NewGuid():N}"[..8],
            ConfigJson = "{}",
            EcoinsSpent = 0,
            ShowAnswersAfterSubmit = true,
            RequireStudentName = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _context.QuizGames.Add(game);
        await _context.SaveChangesAsync();

        for (int i = 1; i <= questionCount; i++)
        {
            _context.QuizGameQuestions.Add(new QuizGameQuestion
            {
                QuizGameId = game.Id,
                Number = i,
                QuestionType = "multiple_choice",
                QuestionText = $"Câu hỏi {i} của {title}",
                OptionsJson = "[\"A\",\"B\",\"C\",\"D\"]",
                CorrectAnswerIndex = i % 4,
                Explanation = $"Giải thích câu {i}",
                Difficulty = i % 2 == 0 ? "easy" : "hard",
            });
        }
        await _context.SaveChangesAsync();

        // Reload with questions
        return await _context.QuizGames
            .Include(q => q.Questions)
            .FirstAsync(q => q.Id == game.Id);
    }

    private static Dictionary<string, object> GetAnonymousProperties(object obj, params string[] propertyNames)
    {
        var result = new Dictionary<string, object>();
        var type = obj.GetType();
        foreach (var name in propertyNames)
        {
            var prop = type.GetProperty(name)
                ?? throw new InvalidOperationException($"Property '{name}' not found on anonymous type.");
            result[name] = prop.GetValue(obj)!;
        }
        return result;
    }
}
