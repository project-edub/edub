using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Authorize(Roles = "Lecturer")]
public class ScoreListController : ControllerBase
{
    private readonly IScoreListService _scoreListService;

    public ScoreListController(IScoreListService scoreListService)
    {
        _scoreListService = scoreListService;
    }

    [HttpPut("api/student-list-columns/{id}/score-metadata")]
    public async Task<IActionResult> UpdateScoreMetadata(int id, [FromBody] UpdateScoreColumnMetadataRequest request)
    {
        try
        {
            var result = await _scoreListService.UpdateColumnMetadata(id, GetUserId(), request);
            return Ok(result);
        }
        catch (ScoreListNotFoundException ex)
        {
            return NotFound(new { error = new { code = "COLUMN_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpGet("api/student-lists/{id}/score-metadata")]
    public async Task<IActionResult> GetScoreMetadata(int id)
    {
        try
        {
            var result = await _scoreListService.GetColumnMetadata(id, GetUserId());
            return Ok(result);
        }
        catch (ScoreListNotFoundException ex)
        {
            return NotFound(new { error = new { code = "STUDENT_LIST_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPatch("api/student-entries/{id}/cell")]
    public async Task<IActionResult> UpdateCell(int id, [FromBody] CellUpdateRequest request)
    {
        try
        {
            var result = await _scoreListService.UpdateCell(id, GetUserId(), request.ColumnName, request.Value, request.Note);
            return Ok(result);
        }
        catch (ScoreListNotFoundException ex)
        {
            return NotFound(new { error = new { code = "ENTRY_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpGet("api/student-entries/{id}/edit-history")]
    public async Task<IActionResult> GetEditHistory(int id)
    {
        try
        {
            var result = await _scoreListService.GetEditHistory(id, GetUserId());
            return Ok(result);
        }
        catch (ScoreListNotFoundException ex)
        {
            return NotFound(new { error = new { code = "ENTRY_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPost("api/student-lists/{id}/apply-template")]
    public async Task<IActionResult> ApplyTemplate(int id, [FromBody] ApplyTemplateRequest request)
    {
        try
        {
            var result = await _scoreListService.ApplyTemplate(id, GetUserId(), request.TemplateId);
            return Ok(result);
        }
        catch (ScoreListNotFoundException ex)
        {
            return NotFound(new { error = new { code = "NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpGet("api/student-list-columns/{id}/classification-ranges")]
    public async Task<IActionResult> GetClassificationRanges(int id)
    {
        try
        {
            var result = await _scoreListService.GetClassificationRanges(id, GetUserId());
            return Ok(result);
        }
        catch (ScoreListNotFoundException ex)
        {
            return NotFound(new { error = new { code = "COLUMN_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPut("api/student-list-columns/{id}/classification-ranges")]
    public async Task<IActionResult> UpdateClassificationRanges(int id, [FromBody] UpdateClassificationRangesRequest request)
    {
        try
        {
            var result = await _scoreListService.UpdateClassificationRanges(id, GetUserId(), request.Ranges);
            return Ok(result);
        }
        catch (ScoreListNotFoundException ex)
        {
            return NotFound(new { error = new { code = "COLUMN_NOT_FOUND", message = ex.Message } });
        }
        catch (ScoreListValidationException ex)
        {
            return BadRequest(new { error = new { code = "VALIDATION_ERROR", message = ex.Message } });
        }
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("User ID not found in token.");
        return int.Parse(userIdClaim);
    }
}
