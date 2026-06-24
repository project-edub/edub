using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Authorize(Roles = "Lecturer")]
public class LessonSuggestionController : ControllerBase
{
    private readonly ILessonSuggestionService _lessonSuggestionService;
    private readonly ICoinService _coinService;
    private readonly ApplicationDbContext _context;

    private static readonly string EcoinConfigPath = Path.Combine(AppContext.BaseDirectory, "game-ecoin-config.json");
    private const int DefaultAiSuggestionCost = 5;

    public LessonSuggestionController(
        ILessonSuggestionService lessonSuggestionService,
        ICoinService coinService,
        ApplicationDbContext context)
    {
        _lessonSuggestionService = lessonSuggestionService;
        _coinService = coinService;
        _context = context;
    }

    /// <summary>
    /// Return the cached AI suggestion for a lesson without generating or charging ECoin.
    /// Returns 204 No Content if no cached suggestion exists.
    /// </summary>
    [HttpGet("api/lessons/{id}/suggestion-cache")]
    public async Task<IActionResult> GetCachedSuggestion(int id)
    {
        var cached = await _lessonSuggestionService.GetCachedSuggestionAsync(id);
        if (cached == null)
            return NoContent();
        return Ok(cached);
    }

    /// <summary>
    /// Get AI-generated content suggestions for a lesson (attachments, keywords, quiz/crossword topics).
    /// Returns cached result without charging ECoin. If no cache, deducts ECoin then generates.
    /// Accepts optional description in request body.
    /// </summary>
    [HttpPost("api/lessons/{id}/suggest-content")]
    public async Task<IActionResult> SuggestContent(int id, [FromBody] SuggestContentRequest? request)
    {
        var userId = GetUserId();

        // Check cache first — no ECoin charge for cached results
        var cached = await _lessonSuggestionService.GetCachedSuggestionAsync(id);
        if (cached != null)
        {
            return Ok(cached);
        }

        // No cache — charge ECoin and generate
        var cost = GetAiSuggestionCost();
        var balance = await _coinService.GetBalanceAsync(userId);
        if (balance < cost)
        {
            return BadRequest(new { error = new { code = "INSUFFICIENT_COINS", message = $"Không đủ ECoin. Cần {cost} ECoin, hiện có {balance}." } });
        }

        await _coinService.DeductCoinsAsync(userId, cost);

        try
        {
            var result = await _lessonSuggestionService.SuggestContentAsync(id, userId, request?.Description);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = new { code = "NOT_FOUND", message = ex.Message } });
        }
    }

    /// <summary>
    /// Accept and apply a specific AI suggestion (attach file, set quiz topic, or set crossword topic).
    /// </summary>
    [HttpPost("api/lessons/{id}/accept-suggestion")]
    public async Task<IActionResult> AcceptSuggestion(int id, [FromBody] AcceptSuggestionRequest request)
    {
        var userId = GetUserId();
        try
        {
            var success = await _lessonSuggestionService.AcceptSuggestionAsync(id, userId, request);
            return Ok(new { success });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = new { code = "NOT_FOUND", message = ex.Message } });
        }
    }

    /// <summary>
    /// Get cost estimate for generating AI suggestions for all lessons in a plan.
    /// </summary>
    [HttpGet("api/lesson-plans/{planId}/suggest-all-cost")]
    public async Task<IActionResult> GetSuggestAllCost(int planId)
    {
        var userId = GetUserId();
        var plan = await _context.LessonPlans
            .Include(lp => lp.Lessons)
            .FirstOrDefaultAsync(lp => lp.Id == planId && lp.LecturerId == userId);

        if (plan == null)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Không tìm thấy giáo án" } });

        var lessonIds = plan.Lessons.Select(l => l.Id).ToList();
        var cachedCount = await _context.LessonSuggestionCaches
            .Where(c => lessonIds.Contains(c.LessonId) && c.ExpiresAt > DateTime.UtcNow)
            .Select(c => c.LessonId)
            .Distinct()
            .CountAsync();

        var uncachedCount = lessonIds.Count - cachedCount;
        var costPerLesson = GetAiSuggestionCost();

        return Ok(new { totalLessons = lessonIds.Count, uncachedCount, costPerLesson, totalCost = uncachedCount * costPerLesson });
    }

    /// <summary>
    /// Generate AI suggestions for all uncached lessons in a plan (batch operation).
    /// </summary>
    [HttpPost("api/lesson-plans/{planId}/suggest-all")]
    public async Task<IActionResult> SuggestAll(int planId, [FromBody] SuggestContentRequest? request)
    {
        var userId = GetUserId();

        var plan = await _context.LessonPlans
            .Include(lp => lp.Lessons)
            .FirstOrDefaultAsync(lp => lp.Id == planId && lp.LecturerId == userId);

        if (plan == null)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Không tìm thấy giáo án" } });

        var lessonIds = plan.Lessons.Select(l => l.Id).ToList();
        var cachedLessonIds = await _context.LessonSuggestionCaches
            .Where(c => lessonIds.Contains(c.LessonId) && c.ExpiresAt > DateTime.UtcNow)
            .Select(c => c.LessonId)
            .Distinct()
            .ToListAsync();

        var uncachedLessons = plan.Lessons.Where(l => !cachedLessonIds.Contains(l.Id)).ToList();
        var cost = GetAiSuggestionCost() * uncachedLessons.Count;

        if (cost > 0)
        {
            var balance = await _coinService.GetBalanceAsync(userId);
            if (balance < cost)
            {
                return BadRequest(new { error = new { code = "INSUFFICIENT_COINS", message = $"Không đủ ECoin. Cần {cost} ECoin, hiện có {balance}." } });
            }
            await _coinService.DeductCoinsAsync(userId, cost);
        }

        var results = new List<object>();
        foreach (var lesson in uncachedLessons)
        {
            try
            {
                var result = await _lessonSuggestionService.SuggestContentAsync(lesson.Id, userId, request?.Description);
                results.Add(new { lessonId = lesson.Id, lessonName = lesson.Name, suggestion = result });
            }
            catch
            {
                results.Add(new { lessonId = lesson.Id, lessonName = lesson.Name, suggestion = (object?)null });
            }
        }

        return Ok(new { totalProcessed = uncachedLessons.Count, totalCost = cost, results });
    }

    private int GetAiSuggestionCost()
    {
        try
        {
            if (System.IO.File.Exists(EcoinConfigPath))
            {
                var json = System.IO.File.ReadAllText(EcoinConfigPath);
                var doc = System.Text.Json.JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("aiSuggestionCost", out var val))
                {
                    return val.GetInt32();
                }
            }
        }
        catch
        {
            // Fall through to default
        }
        return DefaultAiSuggestionCost;
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? throw new UnauthorizedAccessException("User ID not found in token.");

        if (!int.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Invalid user ID in token.");

        return userId;
    }
}
