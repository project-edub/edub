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

    [HttpPost("api/lessons/{id}/attachments/from-storage")]
    public async Task<IActionResult> AddAttachmentFromStorage(int id, [FromBody] AddAttachmentFromStorageRequest request)
    {
        var userId = GetUserId();
        try
        {
            var attachment = await _lessonService.AddAttachmentFromStorageAsync(id, userId, request.StorageItemId);
            return Created($"api/lesson-attachments/{attachment.Id}", attachment);
        }
        catch (LessonNotFoundException ex)
        {
            return BadRequest(new { error = new { code = "INVALID_STORAGE_ITEM", message = ex.Message } });
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

    [HttpGet("api/lesson-attachments/{id}/download")]
    public async Task<IActionResult> DownloadAttachment(int id)
    {
        var userId = GetUserId();
        try
        {
            var (stream, fileName, contentType) = await _lessonService.GetAttachmentFileAsync(id, userId);
            return File(stream, contentType, fileName);
        }
        catch (LessonNotFoundException ex)
        {
            return NotFound(new { error = new { code = "ATTACHMENT_NOT_FOUND", message = ex.Message } });
        }
    }

    /// <summary>
    /// Public download endpoint that accepts JWT token as a query parameter.
    /// Used by Google Docs Viewer / Office Online to access the file.
    /// </summary>
    [HttpGet("api/lesson-attachments/{id}/view")]
    [AllowAnonymous]
    public async Task<IActionResult> ViewAttachment(int id, [FromQuery] string token)
    {
        if (string.IsNullOrWhiteSpace(token))
            return Unauthorized();

        // Validate the JWT token manually
        int userId;
        try
        {
            var handler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
            var jwtToken = handler.ReadJwtToken(token);
            var userIdClaim = jwtToken.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier || c.Type == "sub");
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out userId))
                return Unauthorized();
        }
        catch
        {
            return Unauthorized();
        }

        try
        {
            var (stream, fileName, contentType) = await _lessonService.GetAttachmentFileAsync(id, userId);
            // Set Content-Disposition to inline so browsers/viewers render the file
            Response.Headers.Append("Content-Disposition", $"inline; filename=\"{fileName}\"");
            return File(stream, contentType);
        }
        catch (LessonNotFoundException)
        {
            return NotFound();
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
