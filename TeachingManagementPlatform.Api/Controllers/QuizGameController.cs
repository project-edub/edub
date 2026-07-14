using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Route("api/quiz-game")]
[Authorize]
public class QuizGameController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<QuizGameController> _logger;

    public QuizGameController(ApplicationDbContext context, ILogger<QuizGameController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // POST /api/quiz-game/create
    [HttpPost("create")]
    public async Task<IActionResult> CreateEmpty([FromBody] CreateEmptyQuizRequest request)
    {
        var userId = GetUserId();

        var slug = await GenerateUniqueSlugAsync();
        var now = DateTime.UtcNow;

        var game = new QuizGame
        {
            UserId = userId,
            Title = request.Title,
            Status = "draft",
            Slug = slug,
            ConfigJson = "{}",
            EcoinsSpent = 0,
            ShowAnswersAfterSubmit = false,
            RequireStudentName = false,
            CreatedAt = now,
            UpdatedAt = now,
        };

        _context.QuizGames.Add(game);
        await _context.SaveChangesAsync();

        return Ok(new { gameId = game.Id, slug = game.Slug });
    }

    // GET /api/quiz-game
    [HttpGet]
    public async Task<IActionResult> GetList()
    {
        var userId = GetUserId();
        var items = await _context.QuizGames
            .Where(q => q.UserId == userId)
            .OrderByDescending(q => q.CreatedAt)
            .Select(q => new QuizListItemDto
            {
                Id = q.Id,
                Title = q.Title,
                Status = q.Status,
                Slug = q.Slug,
                QuestionCount = q.Questions.Count,
                SubmissionCount = q.Submissions.Count,
                EcoinsSpent = q.EcoinsSpent,
                CreatedAt = q.CreatedAt,
            })
            .ToListAsync();
        return Ok(items);
    }

    // GET /api/quiz-game/{id}
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var userId = GetUserId();
        var game = await _context.QuizGames
            .Include(q => q.Questions)
            .FirstOrDefaultAsync(q => q.Id == id && q.UserId == userId);

        if (game == null)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Không tìm thấy bài quiz." } });

        return Ok(MapToDetail(game));
    }

    // PUT /api/quiz-game/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] QuizGameDetailDto dto)
    {
        var userId = GetUserId();
        var game = await _context.QuizGames
            .Include(q => q.Questions)
            .FirstOrDefaultAsync(q => q.Id == id && q.UserId == userId);

        if (game == null)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Không tìm thấy bài quiz." } });

        game.Title = dto.Title;
        game.ShowAnswersAfterSubmit = dto.ShowAnswersAfterSubmit;
        game.UpdatedAt = DateTime.UtcNow;

        // Update questions
        if (dto.Questions.Count > 0)
        {
            foreach (var qDto in dto.Questions)
            {
                var existing = game.Questions.FirstOrDefault(q => q.Id == qDto.Id);
                if (existing != null)
                {
                    existing.QuestionText = qDto.QuestionText;
                    existing.OptionsJson = qDto.OptionsJson;
                    existing.CorrectAnswerIndex = qDto.CorrectAnswerIndex;
                    existing.CorrectAnswerText = qDto.CorrectAnswerText;
                    existing.Explanation = qDto.Explanation;
                    existing.Number = qDto.Number;
                }
            }
        }

        await _context.SaveChangesAsync();
        return Ok(MapToDetail(game));
    }

    // POST /api/quiz-game/{id}/publish
    [HttpPost("{id:int}/publish")]
    public async Task<IActionResult> Publish(int id, [FromBody] QuizPublishRequest request)
    {
        var userId = GetUserId();
        var game = await _context.QuizGames
            .Include(q => q.Questions)
            .FirstOrDefaultAsync(q => q.Id == id && q.UserId == userId);

        if (game == null)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Không tìm thấy bài quiz." } });

        if (!game.Questions.Any())
            return BadRequest(new { error = new { code = "NO_QUESTIONS", message = "Bài quiz phải có ít nhất một câu hỏi." } });

        game.Status = "published";
        game.ShowAnswersAfterSubmit = request.ShowAnswersAfterSubmit;
        game.PublishedAt = DateTime.UtcNow;
        game.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(MapToDetail(game));
    }

    // DELETE /api/quiz-game/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetUserId();
        var game = await _context.QuizGames
            .FirstOrDefaultAsync(q => q.Id == id && q.UserId == userId);

        if (game == null)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Không tìm thấy bài quiz." } });

        _context.QuizGames.Remove(game);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/quiz-game/{id}/duplicate
    [HttpPost("{id:int}/duplicate")]
    public async Task<IActionResult> Duplicate(int id)
    {
        var userId = GetUserId();
        var game = await _context.QuizGames
            .Include(q => q.Questions)
            .FirstOrDefaultAsync(q => q.Id == id && q.UserId == userId);

        if (game == null)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Không tìm thấy bài quiz." } });

        var slug = await GenerateUniqueSlugAsync();
        var now = DateTime.UtcNow;

        var duplicate = new QuizGame
        {
            UserId = userId,
            Title = $"{game.Title} (Bản sao)",
            Status = "draft",
            Slug = slug,
            ConfigJson = game.ConfigJson,
            EcoinsSpent = 0,
            ShowAnswersAfterSubmit = game.ShowAnswersAfterSubmit,
            RequireStudentName = game.RequireStudentName,
            CreatedAt = now,
            UpdatedAt = now,
            PublishedAt = null,
        };

        _context.QuizGames.Add(duplicate);
        await _context.SaveChangesAsync();

        // Duplicate all questions
        foreach (var q in game.Questions.OrderBy(q => q.Number))
        {
            var dupQuestion = new QuizGameQuestion
            {
                QuizGameId = duplicate.Id,
                Number = q.Number,
                QuestionType = q.QuestionType,
                QuestionText = q.QuestionText,
                OptionsJson = q.OptionsJson,
                CorrectAnswerIndex = q.CorrectAnswerIndex,
                CorrectAnswerText = q.CorrectAnswerText,
                Explanation = q.Explanation,
                Difficulty = q.Difficulty,
            };
            _context.QuizGameQuestions.Add(dupQuestion);
        }
        await _context.SaveChangesAsync();

        return Ok(new { gameId = duplicate.Id, slug = duplicate.Slug });
    }

    // POST /api/quiz-game/{id}/questions
    [HttpPost("{id:int}/questions")]
    public async Task<IActionResult> AddQuestion(int id)
    {
        var userId = GetUserId();
        var game = await _context.QuizGames
            .Include(q => q.Questions)
            .FirstOrDefaultAsync(q => q.Id == id && q.UserId == userId);

        if (game == null)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Không tìm thấy bài quiz." } });

        var nextNumber = game.Questions.Count > 0 ? game.Questions.Max(q => q.Number) + 1 : 1;

        var question = new QuizGameQuestion
        {
            QuizGameId = id,
            Number = nextNumber,
            QuestionType = "multiple_choice",
            QuestionText = "",
            OptionsJson = "[\"Đáp án A\",\"Đáp án B\",\"Đáp án C\",\"Đáp án D\"]",
            CorrectAnswerIndex = 0,
            Difficulty = "medium",
        };

        _context.QuizGameQuestions.Add(question);
        game.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new QuizQuestionDetailDto
        {
            Id = question.Id,
            Number = question.Number,
            QuestionType = question.QuestionType,
            QuestionText = question.QuestionText,
            OptionsJson = question.OptionsJson,
            CorrectAnswerIndex = question.CorrectAnswerIndex,
            CorrectAnswerText = question.CorrectAnswerText,
            Explanation = question.Explanation,
            Difficulty = question.Difficulty,
        });
    }

    // GET /api/quiz-game/{id}/submissions
    [HttpGet("{id:int}/submissions")]
    public async Task<IActionResult> GetSubmissions(int id)
    {
        var userId = GetUserId();
        var game = await _context.QuizGames
            .FirstOrDefaultAsync(q => q.Id == id && q.UserId == userId);

        if (game == null)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Không tìm thấy bài quiz." } });

        var submissions = await _context.QuizSubmissions
            .Where(s => s.QuizGameId == id)
            .OrderByDescending(s => s.SubmittedAt)
            .Select(s => new QuizSubmissionDto
            {
                Id = s.Id,
                StudentName = s.StudentName,
                TotalQuestions = s.TotalQuestions,
                CorrectCount = s.CorrectCount,
                ScorePercent = s.ScorePercent,
                SubmittedAt = s.SubmittedAt,
            })
            .ToListAsync();

        return Ok(submissions);
    }

    private async Task<string> GenerateUniqueSlugAsync()
    {
        const string chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        const int slugLength = 8;
        var random = new Random();

        for (int attempt = 0; attempt < 10; attempt++)
        {
            var slug = new string(Enumerable.Range(0, slugLength)
                .Select(_ => chars[random.Next(chars.Length)])
                .ToArray());
            var exists = await _context.QuizGames.AnyAsync(g => g.Slug == slug);
            if (!exists) return slug;
        }
        return $"{DateTime.UtcNow.Ticks:x}"[..8];
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? throw new UnauthorizedAccessException("User ID not found in token.");
        return int.Parse(userIdClaim);
    }

    private static QuizGameDetailDto MapToDetail(QuizGame game)
    {
        return new QuizGameDetailDto
        {
            Id = game.Id,
            Title = game.Title,
            Status = game.Status,
            Slug = game.Slug,
            ConfigJson = game.ConfigJson,
            ShowAnswersAfterSubmit = game.ShowAnswersAfterSubmit,
            RequireStudentName = game.RequireStudentName,
            EcoinsSpent = game.EcoinsSpent,
            CreatedAt = game.CreatedAt,
            UpdatedAt = game.UpdatedAt,
            PublishedAt = game.PublishedAt,
            Questions = game.Questions.OrderBy(q => q.Number).Select(q => new QuizQuestionDetailDto
            {
                Id = q.Id,
                Number = q.Number,
                QuestionType = q.QuestionType,
                QuestionText = q.QuestionText,
                OptionsJson = q.OptionsJson,
                CorrectAnswerIndex = q.CorrectAnswerIndex,
                CorrectAnswerText = q.CorrectAnswerText,
                Explanation = q.Explanation,
                Difficulty = q.Difficulty,
            }).ToList(),
        };
    }
}
