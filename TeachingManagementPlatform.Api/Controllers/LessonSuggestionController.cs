using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Authorize(Roles = "Lecturer")]
public class LessonSuggestionController : ControllerBase
{
    private readonly ILessonSuggestionService _lessonSuggestionService;
    private readonly ICoinService _coinService;

    private static readonly string EcoinConfigPath = Path.Combine(AppContext.BaseDirectory, "game-ecoin-config.json");
    private const int DefaultAiSuggestionCost = 5;

    public LessonSuggestionController(
        ILessonSuggestionService lessonSuggestionService,
        ICoinService coinService)
    {
        _lessonSuggestionService = lessonSuggestionService;
        _coinService = coinService;
    }

    /// <summary>
    /// Get AI-generated content suggestions for a lesson (attachments, keywords, quiz/crossword topics).
    /// Deducts ECoin before generating. Accepts optional description in request body.
    /// </summary>
    [HttpPost("api/lessons/{id}/suggest-content")]
    public async Task<IActionResult> SuggestContent(int id, [FromBody] SuggestContentRequest? request)
    {
        var userId = GetUserId();

        // Determine cost from config
        var cost = GetAiSuggestionCost();

        // Check balance
        var balance = await _coinService.GetBalanceAsync(userId);
        if (balance < cost)
        {
            return BadRequest(new { error = new { code = "INSUFFICIENT_COINS", message = $"Không đủ ECoin. Cần {cost} ECoin, hiện có {balance}." } });
        }

        // Deduct coins
        await _coinService.DeductCoinsAsync(userId, cost);

        try
        {
            var result = await _lessonSuggestionService.SuggestContentAsync(id, userId);
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
