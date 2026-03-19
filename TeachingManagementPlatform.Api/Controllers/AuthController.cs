using Microsoft.AspNetCore.Mvc;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            var response = await _authService.LoginAsync(request);
            return Ok(response);
        }
        catch (AccountInactiveException ex)
        {
            return StatusCode(403, new { error = new { code = "ACCOUNT_INACTIVE", message = ex.Message } });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = new { code = "INVALID_CREDENTIALS", message = ex.Message } });
        }
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            var response = await _authService.RegisterAsync(request);
            return Ok(response);
        }
        catch (EmailAlreadyExistsException ex)
        {
            return BadRequest(new { error = new { code = "EMAIL_EXISTS", message = ex.Message } });
        }
    }

    [HttpPost("google")]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
    {
        try
        {
            var response = await _authService.GoogleLoginAsync(request);
            return Ok(response);
        }
        catch (AccountInactiveException ex)
        {
            return StatusCode(403, new { error = new { code = "ACCOUNT_INACTIVE", message = ex.Message } });
        }
        catch (GoogleAuthException ex)
        {
            return Unauthorized(new { error = new { code = "GOOGLE_AUTH_FAILED", message = ex.Message } });
        }
    }
}
