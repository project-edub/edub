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
        catch (StorageQuotaExceededException ex)
        {
            return StatusCode(StatusCodes.Status413PayloadTooLarge, new { error = new { code = "STORAGE_QUOTA_EXCEEDED", message = ex.Message } });
        }
        catch (StorageItemNotFoundException ex)
        {
            return NotFound(new { error = new { code = "STORAGE_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpGet("quota")]
    public async Task<IActionResult> GetQuota()
    {
        var userId = GetUserId();
        var quota = await _storageService.GetQuotaAsync(userId);
        return Ok(quota);
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

    [HttpGet("{id:int}/open")]
    public async Task<IActionResult> OpenFile(int id)
    {
        var userId = GetUserId();
        try
        {
            var item = await _storageService.GetByIdAsync(id, userId);

            if (string.IsNullOrWhiteSpace(item.FileUrl))
                return NotFound(new { error = new { code = "STORAGE_NOT_FOUND", message = "Không tìm thấy tệp hợp lệ" } });

            return Redirect(item.FileUrl);
        }
        catch (StorageItemNotFoundException ex)
        {
            return NotFound(new { error = new { code = "STORAGE_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpGet("{id:int}/download")]
    public async Task<IActionResult> DownloadFile(int id)
    {
        var userId = GetUserId();
        try
        {
            var file = await _storageService.GetFileAsync(id, userId);
            return File(file.Stream, file.ContentType, file.FileName, enableRangeProcessing: true);
        }
        catch (StorageItemNotFoundException ex)
        {
            return NotFound(new { error = new { code = "STORAGE_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpGet("{folderId:int}/download-folder")]
    public async Task<IActionResult> DownloadFolder(int folderId)
    {
        var userId = GetUserId();
        try
        {
            var result = await _storageService.DownloadFolderAsync(folderId, userId);
            return File(result.ZipBytes, "application/zip", $"{result.FolderName}.zip");
        }
        catch (StorageItemNotFoundException ex)
        {
            return NotFound(new { error = new { code = "STORAGE_NOT_FOUND", message = ex.Message } });
        }
        catch (StorageValidationException ex)
        {
            return BadRequest(new { error = new { code = "EMPTY_FOLDER", message = ex.Message } });
        }
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("User ID not found in token.");
        return int.Parse(userIdClaim);
    }
}
