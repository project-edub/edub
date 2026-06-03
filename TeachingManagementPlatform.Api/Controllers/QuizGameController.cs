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
