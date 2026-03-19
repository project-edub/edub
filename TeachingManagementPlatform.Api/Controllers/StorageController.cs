using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Route("api/storage")]
[Authorize(Roles = "Lecturer")]
public class StorageController : ControllerBase
{
    private readonly IStorageService _storageService;

    public StorageController(IStorageService storageService)
    {
        _storageService = storageService;
    }

    [HttpGet]
    public async Task<IActionResult> ListRoot([FromQuery] StorageListRequest request)
    {
        var userId = GetUserId();
        var items = await _storageService.ListItemsAsync(userId, null, request);
        return Ok(items);
    }

    [HttpGet("{folderId:int}")]
    public async Task<IActionResult> ListFolder(int folderId, [FromQuery] StorageListRequest request)
    {
        var userId = GetUserId();
        try
        {
            var items = await _storageService.ListItemsAsync(userId, folderId, request);
            return Ok(items);
        }
        catch (StorageItemNotFoundException ex)
        {
            return NotFound(new { error = new { code = "STORAGE_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPost("folders")]
    public async Task<IActionResult> CreateFolder([FromBody] CreateFolderRequest request)
    {
        var userId = GetUserId();
        try
        {
            var folder = await _storageService.CreateFolderAsync(userId, request);
            return CreatedAtAction(nameof(ListFolder), new { folderId = folder.Id }, folder);
        }
        catch (StorageValidationException ex)
        {
            return BadRequest(new { error = new { code = "VALIDATION_ERROR", message = ex.Message } });
        }
        catch (StorageItemNotFoundException ex)
        {
            return NotFound(new { error = new { code = "STORAGE_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPost("files")]
    public async Task<IActionResult> UploadFile(IFormFile file, [FromForm] int? parentFolderId)
    {
        var userId = GetUserId();

        if (file == null || file.Length == 0)
            return BadRequest(new { error = new { code = "VALIDATION_ERROR", message = "Tệp không được để trống" } });

        try
        {
            using var stream = file.OpenReadStream();
            var item = await _storageService.UploadFileAsync(userId, parentFolderId, stream, file.FileName, file.Length);
            return CreatedAtAction(nameof(ListRoot), null, item);
        }
        catch (StorageValidationException ex)
        {
            return BadRequest(new { error = new { code = "VALIDATION_ERROR", message = ex.Message } });
        }
        catch (StorageItemNotFoundException ex)
        {
            return NotFound(new { error = new { code = "STORAGE_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPut("{id:int}/rename")]
    public async Task<IActionResult> Rename(int id, [FromBody] RenameItemRequest request)
    {
        var userId = GetUserId();
        try
        {
            var item = await _storageService.RenameAsync(id, userId, request);
            return Ok(item);
        }
        catch (StorageValidationException ex)
        {
            return BadRequest(new { error = new { code = "VALIDATION_ERROR", message = ex.Message } });
        }
        catch (StorageItemNotFoundException ex)
        {
            return NotFound(new { error = new { code = "STORAGE_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetUserId();
        try
        {
            await _storageService.DeleteAsync(id, userId);
            return NoContent();
        }
        catch (StorageItemNotFoundException ex)
        {
            return NotFound(new { error = new { code = "STORAGE_NOT_FOUND", message = ex.Message } });
        }
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("User ID not found in token.");
        return int.Parse(userIdClaim);
    }
}
