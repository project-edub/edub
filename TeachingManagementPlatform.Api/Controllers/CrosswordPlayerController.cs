using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Api.Controllers;

/// <summary>
/// Public controller for student crossword gameplay — no authentication required.
/// </summary>
[ApiController]
[Route("api/play")]
public class CrosswordPlayerController : ControllerBase
{
    private readonly ICrosswordService _crosswordService;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<CrosswordPlayerController> _logger;

    public CrosswordPlayerController(
        ICrosswordService crosswordService,
        ApplicationDbContext context,
        ILogger<CrosswordPlayerController> logger)
    {
        _crosswordService = crosswordService;
        _context = context;
        _logger = logger;
    }

    // GET /api/play/{slug}
    [HttpGet("{slug}")]
    public async Task<IActionResult> GetGame(string slug)
    {
        try
        {
            var result = await _crosswordService.GetForPlayerAsync(slug);
            return Ok(result);
        }
        catch (CrosswordNotFoundException ex)
        {
            return NotFound(new { error = new { code = "NOT_FOUND", message = ex.Message } });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get crossword game for slug {Slug}", slug);
            return StatusCode(500, new { error = new { code = "INTERNAL_ERROR", message = "Không thể xử lý yêu cầu" } });
        }
    }

    // POST /api/play/{slug}/submit
    [HttpPost("{slug}/submit")]
    public async Task<IActionResult> Submit(string slug, [FromBody] CrosswordSubmitRequest request)
    {
        if (request?.Answers == null || request.Answers.Count == 0)
            return BadRequest(new { error = new { code = "VALIDATION_ERROR", message = "Vui lòng cung cấp đáp án." } });

        try
        {
            // Load the published game with its words
            var game = await _context.CrosswordGames
                .Include(g => g.Words)
                .FirstOrDefaultAsync(g => g.Slug == slug && g.Status == "published");

            if (game == null)
                return NotFound(new { error = new { code = "NOT_FOUND", message = "Không tìm thấy trò chơi ô chữ." } });

            // Check deadline
            if (game.Deadline.HasValue && DateTime.UtcNow > game.Deadline.Value)
                return BadRequest(new { error = new { code = "GAME_EXPIRED", message = "Trò chơi đã hết hạn." } });

            // Build a lookup of wordId → correct answer (normalized: uppercase, no diacritics)
            var wordLookup = game.Words.ToDictionary(w => w.Id, w => w.Word);

            var results = new List<CrosswordWordResult>();

            foreach (var (wordId, studentAnswer) in request.Answers)
            {
                if (!wordLookup.TryGetValue(wordId, out var correctAnswer))
                    continue; // skip unknown word IDs

                var normalizedStudent = NormalizeAnswer(studentAnswer);
                var normalizedCorrect = NormalizeAnswer(correctAnswer);

                results.Add(new CrosswordWordResult
                {
                    WordId = wordId,
                    IsCorrect = string.Equals(normalizedStudent, normalizedCorrect, StringComparison.OrdinalIgnoreCase)
                });
            }

            var correctCount = results.Count(r => r.IsCorrect);
            var totalCount = results.Count;

            return Ok(new CrosswordSubmitResponse
            {
                Results = results,
                CorrectCount = correctCount,
                TotalCount = totalCount,
                AllCorrect = correctCount == totalCount && totalCount > 0
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to submit answers for crossword slug {Slug}", slug);
            return StatusCode(500, new { error = new { code = "INTERNAL_ERROR", message = "Không thể xử lý yêu cầu" } });
        }
    }

    /// <summary>
    /// Normalizes an answer for comparison: removes Vietnamese diacritics,
    /// converts đ/Đ to D, uppercases, and strips non-alphabetic characters except underscore.
    /// Mirrors the frontend viNormalizer logic (Requirements 11).
    /// </summary>
    private static string NormalizeAnswer(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return string.Empty;

        // NFD decompose to separate base characters from diacritics
        var normalized = input.Normalize(System.Text.NormalizationForm.FormD);

        var sb = new System.Text.StringBuilder();
        foreach (var c in normalized)
        {
            var category = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c);

            // Skip combining diacritical marks
            if (category == System.Globalization.UnicodeCategory.NonSpacingMark)
                continue;

            // Convert đ/Đ to D
            if (c == 'đ' || c == 'Đ')
            {
                sb.Append('D');
                continue;
            }

            // Keep A-Z, a-z, underscore
            if ((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || c == '_')
                sb.Append(c);
        }

        return sb.ToString().ToUpperInvariant();
    }
}
