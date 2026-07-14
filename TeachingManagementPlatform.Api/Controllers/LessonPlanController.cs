using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
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
    private readonly ApplicationDbContext _context;

    public LessonPlanController(ILessonPlanService lessonPlanService, ApplicationDbContext context)
    {
        _lessonPlanService = lessonPlanService;
        _context = context;
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

    [HttpPut("{id}/share")]
    public async Task<IActionResult> ToggleShare(int id, [FromBody] ToggleShareRequest request)
    {
        var userId = GetUserId();
        var plan = await _context.LessonPlans
            .FirstOrDefaultAsync(lp => lp.Id == id && lp.LecturerId == userId);

        if (plan == null)
            return NotFound(new { error = new { code = "LESSON_PLAN_NOT_FOUND", message = "Không tìm thấy giáo án" } });

        plan.IsShared = request.IsShared;
        plan.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { isShared = plan.IsShared });
    }

    [HttpGet("/api/shared-lesson-plans")]
    [Authorize(Roles = "Lecturer,Admin")]
    public async Task<IActionResult> GetSharedLessonPlans(
        [FromQuery] string? subject = null,
        [FromQuery] string? grade = null)
    {
        var query = _context.LessonPlans
            .Where(lp => lp.IsShared)
            .Include(lp => lp.Lecturer)
            .Include(lp => lp.Lessons)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(subject))
            query = query.Where(lp => lp.Subject.Contains(subject));
        if (!string.IsNullOrWhiteSpace(grade))
            query = query.Where(lp => lp.Grade == grade);

        var plans = await query
            .OrderByDescending(lp => lp.CreatedAt)
            .Select(lp => new SharedLessonPlanResponse
            {
                Id = lp.Id,
                Subject = lp.Subject,
                Grade = lp.Grade,
                SchoolYearStart = lp.SchoolYearStart,
                SchoolYearEnd = lp.SchoolYearEnd,
                LessonCount = lp.Lessons.Count,
                LecturerName = lp.Lecturer.FullName != "" ? lp.Lecturer.FullName : lp.Lecturer.Email,
                CreatedAt = lp.CreatedAt
            })
            .ToListAsync();

        return Ok(plans);
    }

    [HttpGet("/api/shared-lesson-plans/{id}")]
    [Authorize(Roles = "Lecturer,Admin")]
    public async Task<IActionResult> GetSharedLessonPlanDetail(int id)
    {
        var plan = await _context.LessonPlans
            .Where(lp => lp.Id == id && lp.IsShared)
            .Include(lp => lp.Lecturer)
            .Include(lp => lp.Lessons)
            .FirstOrDefaultAsync();

        if (plan == null)
            return NotFound(new { error = new { code = "LESSON_PLAN_NOT_FOUND", message = "Không tìm thấy giáo án chia sẻ" } });

        return Ok(new
        {
            id = plan.Id,
            subject = plan.Subject,
            grade = plan.Grade,
            schoolYearStart = plan.SchoolYearStart,
            schoolYearEnd = plan.SchoolYearEnd,
            lecturerName = plan.Lecturer.FullName != "" ? plan.Lecturer.FullName : plan.Lecturer.Email,
            lessons = plan.Lessons.OrderBy(l => l.OrderIndex).Select(l => new { id = l.Id, name = l.Name, orderIndex = l.OrderIndex }).ToList()
        });
    }

    [HttpPost("copy/{sharedPlanId}")]
    public async Task<IActionResult> CopySharedPlan(int sharedPlanId)
    {
        var userId = GetUserId();
        var sourcePlan = await _context.LessonPlans
            .Include(lp => lp.Lessons)
                .ThenInclude(l => l.Documents)
            .FirstOrDefaultAsync(lp => lp.Id == sharedPlanId && lp.IsShared);

        if (sourcePlan == null)
            return NotFound(new { error = new { code = "LESSON_PLAN_NOT_FOUND", message = "Không tìm thấy giáo án chia sẻ" } });

        var newPlan = new LessonPlan
        {
            LecturerId = userId,
            Subject = sourcePlan.Subject,
            Grade = sourcePlan.Grade,
            SchoolYearStart = sourcePlan.SchoolYearStart,
            SchoolYearEnd = sourcePlan.SchoolYearEnd,
            IsShared = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        foreach (var lesson in sourcePlan.Lessons)
        {
            var newLesson = new Lesson
            {
                Name = lesson.Name,
                OrderIndex = lesson.OrderIndex
            };

            foreach (var doc in lesson.Documents)
            {
                newLesson.Documents.Add(new LessonDocument
                {
                    Name = doc.Name,
                    Link = doc.Link,
                    PageRange = doc.PageRange
                });
            }

            newPlan.Lessons.Add(newLesson);
        }

        _context.LessonPlans.Add(newPlan);
        await _context.SaveChangesAsync();

        return Ok(new { id = newPlan.Id });
    }

    [HttpPost("{id}/generate-code")]
    public async Task<IActionResult> GenerateShareCode(int id)
    {
        var userId = GetUserId();
        var plan = await _context.LessonPlans
            .FirstOrDefaultAsync(lp => lp.Id == id && lp.LecturerId == userId);

        if (plan == null)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Không tìm thấy giáo án" } });

        var code = Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper();
        plan.ShareCode = code;
        plan.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(new { shareCode = code });
    }

    [HttpPost("join/{code}")]
    public async Task<IActionResult> JoinByCode(string code)
    {
        var userId = GetUserId();
        var sourcePlan = await _context.LessonPlans
            .Include(lp => lp.Lessons)
                .ThenInclude(l => l.Documents)
            .FirstOrDefaultAsync(lp => lp.ShareCode == code);

        if (sourcePlan == null)
            return NotFound(new { error = new { code = "INVALID_CODE", message = "Mã giáo án không hợp lệ" } });

        if (sourcePlan.LecturerId == userId)
            return BadRequest(new { error = new { code = "OWN_PLAN", message = "Đây là giáo án của bạn" } });

        var newPlan = new LessonPlan
        {
            LecturerId = userId,
            Subject = sourcePlan.Subject,
            Grade = sourcePlan.Grade,
            SchoolYearStart = sourcePlan.SchoolYearStart,
            SchoolYearEnd = sourcePlan.SchoolYearEnd,
            IsShared = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        foreach (var lesson in sourcePlan.Lessons)
        {
            var newLesson = new Lesson
            {
                Name = lesson.Name,
                OrderIndex = lesson.OrderIndex
            };

            foreach (var doc in lesson.Documents)
            {
                newLesson.Documents.Add(new LessonDocument
                {
                    Name = doc.Name,
                    Link = doc.Link,
                    PageRange = doc.PageRange
                });
            }

            newPlan.Lessons.Add(newLesson);
        }

        _context.LessonPlans.Add(newPlan);
        await _context.SaveChangesAsync();

        return Ok(new { id = newPlan.Id, subject = newPlan.Subject });
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
