using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Authorize(Roles = "Lecturer")]
public class LessonController : ControllerBase
{
    private readonly ILessonService _lessonService;

    public LessonController(ILessonService lessonService)
    {
        _lessonService = lessonService;
    }

    [HttpGet("api/lessons/{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var userId = GetUserId();
        try
        {
            var lesson = await _lessonService.GetByIdAsync(id, userId);
            return Ok(lesson);
        }
        catch (LessonNotFoundException ex)
        {
            return NotFound(new { error = new { code = "LESSON_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPut("api/lessons/{id}")]
    public async Task<IActionResult> UpdateName(int id, [FromBody] UpdateLessonNameRequest request)
    {
        var userId = GetUserId();
        try
        {
            var lesson = await _lessonService.UpdateNameAsync(id, userId, request);
            return Ok(lesson);
        }
        catch (LessonNotFoundException ex)
        {
            return NotFound(new { error = new { code = "LESSON_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPost("api/lessons/{id}/documents")]
    public async Task<IActionResult> AddDocument(int id, [FromBody] CreateDocumentRequest request)
    {
        var userId = GetUserId();
        try
        {
            var document = await _lessonService.AddDocumentAsync(id, userId, request);
            return Created($"api/lesson-documents/{document.Id}", document);
        }
        catch (LessonNotFoundException ex)
        {
            return NotFound(new { error = new { code = "LESSON_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPut("api/lesson-documents/{id}")]
    public async Task<IActionResult> UpdateDocument(int id, [FromBody] UpdateDocumentRequest request)
    {
        var userId = GetUserId();
        try
        {
            var document = await _lessonService.UpdateDocumentAsync(id, userId, request);
            return Ok(document);
        }
        catch (LessonNotFoundException ex)
        {
            return NotFound(new { error = new { code = "DOCUMENT_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpDelete("api/lesson-documents/{id}")]
    public async Task<IActionResult> DeleteDocument(int id)
    {
        var userId = GetUserId();
        try
        {
            await _lessonService.DeleteDocumentAsync(id, userId);
            return NoContent();
        }
        catch (LessonNotFoundException ex)
        {
            return NotFound(new { error = new { code = "DOCUMENT_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPost("api/lessons/{id}/attachments")]
    public async Task<IActionResult> AddAttachment(int id, IFormFile file)
    {
        var userId = GetUserId();
        try
        {
            using var stream = file.OpenReadStream();
            var attachment = await _lessonService.AddAttachmentAsync(id, userId, stream, file.FileName, file.Length);
            return Created($"api/lesson-attachments/{attachment.Id}", attachment);
        }
        catch (LessonNotFoundException ex)
        {
            return NotFound(new { error = new { code = "LESSON_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpDelete("api/lesson-attachments/{id}")]
    public async Task<IActionResult> DeleteAttachment(int id)
    {
        var userId = GetUserId();
        try
        {
            await _lessonService.DeleteAttachmentAsync(id, userId);
            return NoContent();
        }
        catch (LessonNotFoundException ex)
        {
            return NotFound(new { error = new { code = "ATTACHMENT_NOT_FOUND", message = ex.Message } });
        }
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("User ID not found in token.");
        return int.Parse(userIdClaim);
    }
}
