using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Route("api/crossword")]
[Authorize]
public class CrosswordController : ControllerBase
{
    private readonly ICrosswordService _crosswordService;
    private readonly ILogger<CrosswordController> _logger;

    public CrosswordController(
        ICrosswordService crosswordService,
        ILogger<CrosswordController> logger)
    {
        _crosswordService = crosswordService;
        _logger = logger;
    }

    // POST /api/crossword/upload
    [HttpPost("upload")]
    public async Task<IActionResult> Upload()
    {
        var files = Request.Form.Files;
        if (files == null || files.Count == 0)
            return BadRequest(new { error = new { code = "VALIDATION_ERROR", message = "Vui lòng chọn ít nhất một tệp." } });

        var userId = GetUserId();

        try
        {
            var result = await _crosswordService.UploadAndExtractAsync(userId, files.ToList());
            return Ok(result);
        }
        catch (CrosswordValidationException ex)
        {
            return BadRequest(new { error = new { code = ex.Code, message = ex.Message } });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upload crossword documents for user {UserId}", userId);
            return StatusCode(500, new { error = new { code = "INTERNAL_ERROR", message = "Không thể xử lý yêu cầu" } });
        }
    }

    // POST /api/crossword/estimate
    [HttpPost("estimate")]
    public async Task<IActionResult> Estimate([FromBody] CrosswordEstimateRequest request)
    {
        var userId = GetUserId();

        try
        {
            var result = await _crosswordService.EstimateEcoinAsync(userId, request);
            return Ok(result);
        }
        catch (CrosswordValidationException ex)
        {
            return BadRequest(new { error = new { code = ex.Code, message = ex.Message } });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to estimate ECoin for user {UserId}", userId);
            return StatusCode(500, new { error = new { code = "INTERNAL_ERROR", message = "Không thể xử lý yêu cầu" } });
        }
    }

    // POST /api/crossword/generate
    [HttpPost("generate")]
    [Authorize(Roles = "Lecturer")]
    public async Task<IActionResult> Generate([FromBody] CrosswordGenerateRequest request)
    {
        var userId = GetUserId();

        try
        {
            var result = await _crosswordService.GenerateAsync(userId, request);
            return Ok(result);
        }
        catch (CrosswordValidationException ex)
        {
            return BadRequest(new { error = new { code = ex.Code, message = ex.Message } });
        }
        catch (CrosswordNotFoundException ex)
        {
            return NotFound(new { error = new { code = "NOT_FOUND", message = ex.Message } });
        }
        catch (CrosswordInsufficientEcoinException ex)
        {
            return StatusCode(402, new
            {
                error = new
                {
                    code = "INSUFFICIENT_ECOIN",
                    message = ex.Message,
                    requiredCoin = ex.Required,
                    currentCoinBalance = ex.Current
                }
            });
        }
        catch (AIServiceException ex)
        {
            _logger.LogWarning(ex, "AIService failure during crossword generation for user {UserId}", userId);
            return StatusCode(502, new { error = new { code = "AI_ERROR", message = ex.Message } });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate crossword for user {UserId}", userId);
            return StatusCode(500, new { error = new { code = "INTERNAL_ERROR", message = "Không thể xử lý yêu cầu" } });
        }
    }

    // POST /api/crossword/regenerate/{gameId}
    [HttpPost("regenerate/{gameId:int}")]
    public async Task<IActionResult> Regenerate(int gameId, [FromBody] CrosswordGenerationConfig config)
    {
        var userId = GetUserId();

        try
        {
            var result = await _crosswordService.RegenerateAsync(userId, gameId, config);
            return Ok(result);
        }
        catch (CrosswordValidationException ex)
        {
            return BadRequest(new { error = new { code = ex.Code, message = ex.Message } });
        }
        catch (CrosswordNotFoundException ex)
        {
            return NotFound(new { error = new { code = "NOT_FOUND", message = ex.Message } });
        }
        catch (CrosswordInsufficientEcoinException ex)
        {
            return StatusCode(402, new
            {
                error = new
                {
                    code = "INSUFFICIENT_ECOIN",
                    message = ex.Message,
                    requiredCoin = ex.Required,
                    currentCoinBalance = ex.Current
                }
            });
        }
        catch (AIServiceException ex)
        {
            _logger.LogWarning(ex, "AIService failure during crossword regeneration for user {UserId}, game {GameId}", userId, gameId);
            return StatusCode(502, new { error = new { code = "AI_ERROR", message = ex.Message } });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to regenerate crossword {GameId} for user {UserId}", gameId, userId);
            return StatusCode(500, new { error = new { code = "INTERNAL_ERROR", message = "Không thể xử lý yêu cầu" } });
        }
    }

    // GET /api/crossword/{gameId}
    [HttpGet("{gameId:int}")]
    public async Task<IActionResult> GetById(int gameId)
    {
        var userId = GetUserId();

        try
        {
            var result = await _crosswordService.GetByIdAsync(userId, gameId);
            return Ok(result);
        }
        catch (CrosswordNotFoundException ex)
        {
            return NotFound(new { error = new { code = "NOT_FOUND", message = ex.Message } });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get crossword {GameId} for user {UserId}", gameId, userId);
            return StatusCode(500, new { error = new { code = "INTERNAL_ERROR", message = "Không thể xử lý yêu cầu" } });
        }
    }

    // PUT /api/crossword/{gameId}
    [HttpPut("{gameId:int}")]
    public async Task<IActionResult> Update(int gameId, [FromBody] CrosswordGameDto dto)
    {
        var userId = GetUserId();

        try
        {
            await _crosswordService.UpdateAsync(userId, gameId, dto);
            return NoContent();
        }
        catch (CrosswordValidationException ex)
        {
            return BadRequest(new { error = new { code = ex.Code, message = ex.Message } });
        }
        catch (CrosswordNotFoundException ex)
        {
            return NotFound(new { error = new { code = "NOT_FOUND", message = ex.Message } });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update crossword {GameId} for user {UserId}", gameId, userId);
            return StatusCode(500, new { error = new { code = "INTERNAL_ERROR", message = "Không thể xử lý yêu cầu" } });
        }
    }

    // PATCH /api/crossword/{gameId}/word/{wordId}
    [HttpPatch("{gameId:int}/word/{wordId:int}")]
    public async Task<IActionResult> UpdateWord(int gameId, int wordId, [FromBody] CrosswordWordUpdateRequest request)
    {
        var userId = GetUserId();

        try
        {
            await _crosswordService.UpdateWordAsync(userId, gameId, wordId, request);
            return NoContent();
        }
        catch (CrosswordValidationException ex)
        {
            return BadRequest(new { error = new { code = ex.Code, message = ex.Message } });
        }
        catch (CrosswordNotFoundException ex)
        {
            return NotFound(new { error = new { code = "NOT_FOUND", message = ex.Message } });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update word {WordId} in crossword {GameId} for user {UserId}", wordId, gameId, userId);
            return StatusCode(500, new { error = new { code = "INTERNAL_ERROR", message = "Không thể xử lý yêu cầu" } });
        }
    }

    // POST /api/crossword/{gameId}/publish
    [HttpPost("{gameId:int}/publish")]
    public async Task<IActionResult> Publish(int gameId, [FromBody] CrosswordPublishRequest request)
    {
        var userId = GetUserId();

        try
        {
            await _crosswordService.PublishAsync(userId, gameId, request);
            // Return updated game data so frontend can update its state
            var updatedGame = await _crosswordService.GetByIdAsync(userId, gameId);
            return Ok(updatedGame);
        }
        catch (CrosswordValidationException ex)
        {
            return BadRequest(new { error = new { code = ex.Code, message = ex.Message } });
        }
        catch (CrosswordNotFoundException ex)
        {
            return NotFound(new { error = new { code = "NOT_FOUND", message = ex.Message } });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish crossword {GameId} for user {UserId}", gameId, userId);
            return StatusCode(500, new { error = new { code = "INTERNAL_ERROR", message = "Không thể xử lý yêu cầu" } });
        }
    }

    // GET /api/crossword
    [HttpGet]
    public async Task<IActionResult> GetList()
    {
        var userId = GetUserId();

        try
        {
            var result = await _crosswordService.GetListAsync(userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get crossword list for user {UserId}", userId);
            return StatusCode(500, new { error = new { code = "INTERNAL_ERROR", message = "Không thể xử lý yêu cầu" } });
        }
    }

    // DELETE /api/crossword/{gameId}
    [HttpDelete("{gameId:int}")]
    public async Task<IActionResult> Delete(int gameId)
    {
        var userId = GetUserId();

        try
        {
            await _crosswordService.DeleteAsync(userId, gameId);
            return NoContent();
        }
        catch (CrosswordNotFoundException ex)
        {
            return NotFound(new { error = new { code = "NOT_FOUND", message = ex.Message } });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete crossword {GameId} for user {UserId}", gameId, userId);
            return StatusCode(500, new { error = new { code = "INTERNAL_ERROR", message = "Không thể xử lý yêu cầu" } });
        }
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? throw new UnauthorizedAccessException("User ID not found in token.");

        return int.Parse(userIdClaim);
    }
}
