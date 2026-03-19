using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Authorize(Roles = "Lecturer")]
public class MiniGameController : ControllerBase
{
    private readonly IMiniGameService _miniGameService;

    public MiniGameController(IMiniGameService miniGameService)
    {
        _miniGameService = miniGameService;
    }

    [HttpPost("api/lessons/{lessonId}/mini-games")]
    public async Task<IActionResult> Create(int lessonId, [FromBody] CreateMiniGameRequest request)
    {
        var userId = GetUserId();
        try
        {
            var result = await _miniGameService.CreateAsync(lessonId, userId, request);
            return Created($"api/mini-games/{result.Id}", result);
        }
        catch (MiniGameNotFoundException ex)
        {
            return NotFound(new { error = new { code = "LESSON_NOT_FOUND", message = ex.Message } });
        }
        catch (AIServiceException ex)
        {
            return StatusCode(502, new { error = new { code = "AI_SERVICE_ERROR", message = ex.Message } });
        }
    }

    [HttpGet("api/mini-games/{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var userId = GetUserId();
        try
        {
            var result = await _miniGameService.GetByIdAsync(id, userId);
            return Ok(result);
        }
        catch (MiniGameNotFoundException ex)
        {
            return NotFound(new { error = new { code = "MINI_GAME_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpGet("api/mini-games/{id}/play")]
    public async Task<IActionResult> GetPlayData(int id)
    {
        var userId = GetUserId();
        try
        {
            var result = await _miniGameService.GetPlayDataAsync(id, userId);
            return Ok(result);
        }
        catch (MiniGameNotFoundException ex)
        {
            return NotFound(new { error = new { code = "MINI_GAME_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpDelete("api/mini-games/{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetUserId();
        try
        {
            await _miniGameService.DeleteAsync(id, userId);
            return NoContent();
        }
        catch (MiniGameNotFoundException ex)
        {
            return NotFound(new { error = new { code = "MINI_GAME_NOT_FOUND", message = ex.Message } });
        }
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("User ID not found in token.");
        return int.Parse(userIdClaim);
    }
}
