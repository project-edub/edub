using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Authorize(Roles = "Admin,Lecturer")]
public class CurriculumTemplateController : ControllerBase
{
    private readonly ICurriculumTemplateService _curriculumTemplateService;

    public CurriculumTemplateController(ICurriculumTemplateService curriculumTemplateService)
    {
        _curriculumTemplateService = curriculumTemplateService;
    }

    [HttpGet("api/curriculum-templates")]
    public async Task<IActionResult> GetTemplates(
        [FromQuery] string? subject,
        [FromQuery] int? grade)
    {
        var templates = await _curriculumTemplateService.GetTemplatesAsync(subject, grade);
        return Ok(templates);
    }

    [HttpGet("api/curriculum-templates/{id}/lessons")]
    public async Task<IActionResult> GetTemplateLessons(int id)
    {
        try
        {
            var lessons = await _curriculumTemplateService.GetTemplateLessonsAsync(id);
            return Ok(lessons);
        }
        catch (CurriculumTemplateNotFoundException ex)
        {
            return NotFound(new { error = new { code = "TEMPLATE_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPost("api/lesson-plans/{id}/generate-from-template")]
    public async Task<IActionResult> GenerateFromTemplate(int id, [FromBody] GenerateFromTemplateRequest request)
    {
        var userId = GetUserId();
        try
        {
            var result = await _curriculumTemplateService.GenerateFromTemplateAsync(id, request.TemplateId, userId);
            return Ok(result);
        }
        catch (CurriculumTemplateNotFoundException ex)
        {
            return NotFound(new { error = new { code = "NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPost("api/lesson-plans/{id}/save-as-template")]
    public async Task<IActionResult> SaveAsTemplate(int id, [FromBody] SaveAsTemplateRequest request)
    {
        var userId = GetUserId();
        try
        {
            var result = await _curriculumTemplateService.SaveAsTemplateAsync(id, userId, request);
            return Ok(result);
        }
        catch (CurriculumTemplateNotFoundException ex)
        {
            return NotFound(new { error = new { code = "NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPost("api/curriculum-templates")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateTemplate([FromBody] CreateCurriculumTemplateRequest request)
    {
        var template = await _curriculumTemplateService.CreateTemplateAsync(request);
        return Ok(template);
    }

    [HttpPut("api/curriculum-templates/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateTemplate(int id, [FromBody] UpdateCurriculumTemplateRequest request)
    {
        try
        {
            var template = await _curriculumTemplateService.UpdateTemplateAsync(id, request);
            return Ok(template);
        }
        catch (CurriculumTemplateNotFoundException ex)
        {
            return NotFound(new { error = new { code = "TEMPLATE_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpDelete("api/curriculum-templates/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteTemplate(int id)
    {
        try
        {
            await _curriculumTemplateService.DeleteTemplateAsync(id);
            return NoContent();
        }
        catch (CurriculumTemplateNotFoundException ex)
        {
            return NotFound(new { error = new { code = "TEMPLATE_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPut("api/curriculum-templates/{id}/lessons")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateTemplateLessons(int id, [FromBody] UpdateTemplateLessonsRequest request)
    {
        try
        {
            var lessons = await _curriculumTemplateService.UpdateTemplateLessonsAsync(id, request);
            return Ok(lessons);
        }
        catch (CurriculumTemplateNotFoundException ex)
        {
            return NotFound(new { error = new { code = "TEMPLATE_NOT_FOUND", message = ex.Message } });
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
