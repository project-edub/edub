using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Authorize(Roles = "Lecturer")]
public class TeachingScheduleController : ControllerBase
{
    private readonly ITeachingScheduleService _teachingScheduleService;

    public TeachingScheduleController(ITeachingScheduleService teachingScheduleService)
    {
        _teachingScheduleService = teachingScheduleService;
    }

    /// <summary>
    /// Get the current teaching schedule for a class + subject.
    /// </summary>
    [HttpGet("api/classes/{classId}/schedule")]
    public async Task<IActionResult> GetSchedule(int classId, [FromQuery] string subject)
    {
        var userId = GetUserId();
        try
        {
            var schedule = await _teachingScheduleService.GetScheduleAsync(classId, subject, userId);
            if (schedule == null)
                return NotFound(new { error = new { code = "SCHEDULE_NOT_FOUND", message = "Không tìm thấy lịch dạy cho lớp và môn học này." } });

            return Ok(schedule);
        }
        catch (TeachingScheduleNotFoundException ex)
        {
            return NotFound(new { error = new { code = "NOT_FOUND", message = ex.Message } });
        }
    }

    /// <summary>
    /// Create or update the teaching schedule for a class + subject.
    /// </summary>
    [HttpPut("api/classes/{classId}/schedule")]
    public async Task<IActionResult> UpsertSchedule(int classId, [FromBody] UpsertScheduleRequest request)
    {
        var userId = GetUserId();
        try
        {
            var result = await _teachingScheduleService.UpsertScheduleAsync(classId, request.Subject, userId, request);
            return Ok(result);
        }
        catch (TeachingScheduleNotFoundException ex)
        {
            return NotFound(new { error = new { code = "NOT_FOUND", message = ex.Message } });
        }
    }

    /// <summary>
    /// Calculate teaching dates preview for a lesson plan in a class.
    /// Does NOT persist anything — returns a preview for the teacher to review.
    /// </summary>
    [HttpPost("api/classes/{classId}/lesson-plans/{lessonPlanId}/calculate-dates")]
    public async Task<IActionResult> CalculateDates(int classId, int lessonPlanId)
    {
        var userId = GetUserId();
        try
        {
            var result = await _teachingScheduleService.CalculateDatesAsync(classId, lessonPlanId, userId);
            return Ok(result);
        }
        catch (TeachingScheduleNotFoundException ex)
        {
            return NotFound(new { error = new { code = "NOT_FOUND", message = ex.Message } });
        }
    }

    /// <summary>
    /// Apply calculated teaching dates to a lesson plan in a class.
    /// Persists the dates after teacher review/modification.
    /// </summary>
    [HttpPost("api/classes/{classId}/lesson-plans/{lessonPlanId}/apply-dates")]
    public async Task<IActionResult> ApplyDates(int classId, int lessonPlanId, [FromBody] ApplyDatesRequest request)
    {
        var userId = GetUserId();
        try
        {
            var success = await _teachingScheduleService.ApplyDatesAsync(classId, lessonPlanId, userId, request);
            return Ok(new { success });
        }
        catch (TeachingScheduleNotFoundException ex)
        {
            return NotFound(new { error = new { code = "NOT_FOUND", message = ex.Message } });
        }
    }

    /// <summary>
    /// Get all available school year calendars.
    /// </summary>
    [HttpGet("api/school-year-calendars")]
    public async Task<IActionResult> GetCalendars()
    {
        var calendars = await _teachingScheduleService.GetCalendarsAsync();
        return Ok(calendars);
    }

    /// <summary>
    /// Get holidays for a specific school year calendar.
    /// </summary>
    [HttpGet("api/school-year-calendars/{id}/holidays")]
    public async Task<IActionResult> GetCalendarHolidays(int id)
    {
        try
        {
            var holidays = await _teachingScheduleService.GetCalendarHolidaysAsync(id);
            return Ok(holidays);
        }
        catch (TeachingScheduleNotFoundException ex)
        {
            return NotFound(new { error = new { code = "NOT_FOUND", message = ex.Message } });
        }
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
