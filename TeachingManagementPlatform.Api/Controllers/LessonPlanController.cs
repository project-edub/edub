using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Route("api/lesson-plans")]
[Authorize(Roles = "Lecturer")]
public class LessonPlanController : ControllerBase
{
    private readonly ILessonPlanService _lessonPlanService;

    public LessonPlanController(ILessonPlanService lessonPlanService)
    {
        _lessonPlanService = lessonPlanService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? grade = null,
        [FromQuery] string? subject = null,
        [FromQuery] string? schoolYear = null)
    {
        var userId = GetUserId();
        var plans = await _lessonPlanService.GetAllAsync(userId, grade, subject, schoolYear);
        return Ok(plans);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var userId = GetUserId();
        try
        {
            var plan = await _lessonPlanService.GetByIdAsync(id, userId);
            return Ok(plan);
        }
        catch (LessonPlanNotFoundException ex)
        {
            return NotFound(new { error = new { code = "LESSON_PLAN_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLessonPlanRequest request)
    {
        var userId = GetUserId();
        var plan = await _lessonPlanService.CreateAsync(userId, request);
        return CreatedAtAction(nameof(GetById), new { id = plan.Id }, plan);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateLessonPlanRequest request)
    {
        var userId = GetUserId();
        try
        {
            var plan = await _lessonPlanService.UpdateAsync(id, userId, request);
            return Ok(plan);
        }
        catch (LessonPlanNotFoundException ex)
        {
            return NotFound(new { error = new { code = "LESSON_PLAN_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetUserId();
        try
        {
            await _lessonPlanService.DeleteAsync(id, userId);
            return NoContent();
        }
        catch (LessonPlanNotFoundException ex)
        {
            return NotFound(new { error = new { code = "LESSON_PLAN_NOT_FOUND", message = ex.Message } });
        }
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("User ID not found in token.");
        return int.Parse(userIdClaim);
    }
}
