using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Route("api/user")]
[Authorize]
public class UserSettingsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public UserSettingsController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);

        if (user == null)
            return NotFound(new { error = new { code = "USER_NOT_FOUND", message = "Không tìm thấy người dùng." } });

        return Ok(new UserSettingsResponse
        {
            ThemeColor = user.ThemeColor,
            OnboardingCompleted = user.OnboardingCompleted
        });
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateUserSettingsRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { error = new { code = "INVALID_INPUT", message = "Mã màu HEX không hợp lệ." } });

        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);

        if (user == null)
            return NotFound(new { error = new { code = "USER_NOT_FOUND", message = "Không tìm thấy người dùng." } });

        user.ThemeColor = request.ThemeColor;
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new UserSettingsResponse
        {
            ThemeColor = user.ThemeColor,
            OnboardingCompleted = user.OnboardingCompleted
        });
    }

    [HttpPut("settings/onboarding")]
    public async Task<IActionResult> UpdateOnboardingStatus([FromBody] UpdateOnboardingRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(new { error = new { code = "INVALID_INPUT", message = "Dữ liệu không hợp lệ." } });

        var userId = GetUserId();
        var user = await _db.Users.FindAsync(userId);

        if (user == null)
            return NotFound(new { error = new { code = "USER_NOT_FOUND", message = "Không tìm thấy người dùng." } });

        user.OnboardingCompleted = request.Completed;
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();

        return Ok(new { onboardingCompleted = user.OnboardingCompleted });
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? throw new UnauthorizedAccessException("User ID not found in token.");
        return int.Parse(userIdClaim);
    }
}
