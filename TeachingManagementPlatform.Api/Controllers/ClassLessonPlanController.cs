using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Route("api/classes")]
[Authorize(Roles = "Lecturer")]
public class ClassLessonPlanController : ControllerBase
{
    private readonly IClassLessonPlanService _service;

    public ClassLessonPlanController(IClassLessonPlanService service)
    {
        _service = service;
    }

    [HttpPut("{classId}/lesson-plan")]
    public async Task<IActionResult> AssignLessonPlan(int classId, [FromBody] AssignLessonPlanRequest request)
    {
        var lecturerId = GetUserId();
        try
        {
            var result = await _service.AssignLessonPlanAsync(classId, lecturerId, request);
            return Ok(result);
        }
        catch (ClassLessonPlanNotFoundException ex)
        {
            return NotFound(new { error = new { code = "NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpGet("{classId}/lesson-plan")]
    public async Task<IActionResult> GetAssignedPlan(int classId)
    {
        var lecturerId = GetUserId();
        try
        {
            var result = await _service.GetAssignedPlanAsync(classId, lecturerId);
            if (result == null)
                return Ok(new { });
            return Ok(result);
        }
        catch (ClassLessonPlanNotFoundException ex)
        {
            return NotFound(new { error = new { code = "NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPut("{classId}/lessons/{lessonId}/schedule")]
    public async Task<IActionResult> UpdateLessonSchedule(int classId, int lessonId, [FromBody] UpdateLessonScheduleRequest request)
    {
        var lecturerId = GetUserId();
        try
        {
            var result = await _service.UpdateLessonScheduleAsync(classId, lessonId, lecturerId, request);
            return Ok(result);
        }
        catch (ClassLessonPlanNotFoundException ex)
        {
            return NotFound(new { error = new { code = "NOT_FOUND", message = ex.Message } });
        }
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("User ID not found in token.");
        return int.Parse(userIdClaim);
    }
}
