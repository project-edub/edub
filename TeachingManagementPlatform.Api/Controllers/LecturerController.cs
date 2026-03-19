using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Route("api/lecturer")]
[Authorize(Roles = "Lecturer")]
public class LecturerController : ControllerBase
{
    private readonly IProfileService _profileService;
    private readonly IFileStorage _fileStorage;

    public LecturerController(IProfileService profileService, IFileStorage fileStorage)
    {
        _profileService = profileService;
        _fileStorage = fileStorage;
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = GetUserId();
        try
        {
            var profile = await _profileService.GetProfileAsync(userId);
            return Ok(profile);
        }
        catch (UserNotFoundException ex)
        {
            return NotFound(new { error = new { code = "USER_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = GetUserId();
        try
        {
            var profile = await _profileService.UpdateProfileAsync(userId, request);
            return Ok(profile);
        }
        catch (UserNotFoundException ex)
        {
            return NotFound(new { error = new { code = "USER_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPost("profile/upload-image")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadProfileImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = new { code = "NO_FILE", message = "Vui lòng chọn tệp." } });

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType))
            return BadRequest(new { error = new { code = "INVALID_TYPE", message = "Chỉ chấp nhận ảnh JPEG, PNG, GIF, WEBP." } });

        using var stream = file.OpenReadStream();
        var fileRef = await _fileStorage.SaveFileAsync(stream, file.FileName);
        var imageUrl = $"/uploads/{fileRef}";
        return Ok(new { imageUrl });
    }

    [HttpPost("profile/avatar")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = new { code = "NO_FILE", message = "Vui lòng chọn tệp." } });

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType))
            return BadRequest(new { error = new { code = "INVALID_TYPE", message = "Chỉ chấp nhận ảnh JPEG, PNG, GIF, WEBP." } });

        var userId = GetUserId();
        using var stream = file.OpenReadStream();
        var fileRef = await _fileStorage.SaveFileAsync(stream, file.FileName);
        var avatarUrl = $"/uploads/{fileRef}";

        try
        {
            await _profileService.UpdateAvatarAsync(userId, avatarUrl);
            return Ok(new { avatarUrl });
        }
        catch (UserNotFoundException ex)
        {
            return NotFound(new { error = new { code = "USER_NOT_FOUND", message = ex.Message } });
        }
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("User ID not found in token.");
        return int.Parse(userIdClaim);
    }
}
