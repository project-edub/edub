using Microsoft.AspNetCore.Mvc;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private const string GooglePkceVerifierCookie = "google_pkce_verifier";
    private const string GoogleStateCookie = "google_oauth_state";

    private readonly IAuthService _authService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IAuthService authService, IConfiguration configuration, ILogger<AuthController> logger)
    {
        _authService = authService;
        _configuration = configuration;
        _logger = logger;
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
            _logger.LogWarning(ex, "Google login failed.");
            return Unauthorized(new { error = new { code = "GOOGLE_AUTH_FAILED", message = ex.Message } });
        }
    }

    [HttpGet("google/start")]
    public IActionResult GoogleStart()
    {
        var clientId = _configuration["Google:ClientId"];
        var redirectUri = _configuration["Google:RedirectUri"];

        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(redirectUri))
        {
            return StatusCode(500, new { error = new { code = "GOOGLE_CONFIG_INVALID", message = "Thiếu cấu hình Google." } });
        }

        var codeVerifier = AuthService.GeneratePkceCodeVerifier();
        var codeChallenge = AuthService.GeneratePkceCodeChallenge(codeVerifier);
        var state = AuthService.GenerateOAuthState();

        Response.Cookies.Append(GooglePkceVerifierCookie, codeVerifier, new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddMinutes(10),
            Path = "/api/auth/google"
        });

        Response.Cookies.Append(GoogleStateCookie, state, new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddMinutes(10),
            Path = "/api/auth/google"
        });

        var googleAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth" +
            $"?client_id={Uri.EscapeDataString(clientId)}" +
            $"&redirect_uri={Uri.EscapeDataString(redirectUri)}" +
            "&response_type=code" +
            "&scope=" + Uri.EscapeDataString("openid email profile") +
            $"&state={Uri.EscapeDataString(state)}" +
            $"&code_challenge={Uri.EscapeDataString(codeChallenge)}" +
            "&code_challenge_method=S256" +
            "&prompt=select_account" +
            "&include_granted_scopes=true";

        return Redirect(googleAuthUrl);
    }

    [HttpGet("google/callback")]
    public async Task<IActionResult> GoogleCallback([FromQuery] string? code, [FromQuery] string? error)
    {
        var frontendCallbackUrl = _configuration["Google:FrontendCallbackUrl"];
        if (string.IsNullOrWhiteSpace(frontendCallbackUrl))
        {
            return StatusCode(500, new { error = new { code = "GOOGLE_CONFIG_INVALID", message = "Thiếu cấu hình Google." } });
        }

        var state = Request.Query["state"].ToString();
        var expectedState = Request.Cookies[GoogleStateCookie];
        var codeVerifier = Request.Cookies[GooglePkceVerifierCookie];

        ClearGooglePkceCookies();

        if (string.IsNullOrWhiteSpace(state) || string.IsNullOrWhiteSpace(expectedState) || !string.Equals(state, expectedState, StringComparison.Ordinal))
        {
            var failureUrl = $"{frontendCallbackUrl}?error={Uri.EscapeDataString("Xác thực trạng thái Google không hợp lệ.")}";
            return Redirect(failureUrl);
        }

        if (!string.IsNullOrWhiteSpace(error))
        {
            var failureUrl = $"{frontendCallbackUrl}?error={Uri.EscapeDataString(error)}";
            return Redirect(failureUrl);
        }

        if (string.IsNullOrWhiteSpace(code))
        {
            var failureUrl = $"{frontendCallbackUrl}?error={Uri.EscapeDataString("Thiếu mã xác thực Google.")}";
            return Redirect(failureUrl);
        }

        if (string.IsNullOrWhiteSpace(codeVerifier))
        {
            var failureUrl = $"{frontendCallbackUrl}?error={Uri.EscapeDataString("Thiếu mã xác minh Google.")}";
            return Redirect(failureUrl);
        }

        try
        {
            var response = await _authService.GoogleLoginFromCodeAsync(code, codeVerifier);
            var successUrl = $"{frontendCallbackUrl}?token={Uri.EscapeDataString(response.Token)}&role={Uri.EscapeDataString(response.Role)}";

            if (!string.IsNullOrWhiteSpace(response.GoogleAccessToken))
            {
                successUrl += $"&googleAccessToken={Uri.EscapeDataString(response.GoogleAccessToken)}";
            }

            return Redirect(successUrl);
        }
        catch (AccountInactiveException ex)
        {
            _logger.LogWarning(ex, "Google callback completed for inactive account.");
            var failureUrl = $"{frontendCallbackUrl}?error={Uri.EscapeDataString(ex.Message)}";
            return Redirect(failureUrl);
        }
        catch (GoogleAuthException ex)
        {
            _logger.LogWarning(ex, "Google callback failed.");
            var failureUrl = $"{frontendCallbackUrl}?error={Uri.EscapeDataString(ex.Message)}";
            return Redirect(failureUrl);
        }
    }

    private void ClearGooglePkceCookies()
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddDays(-1),
            Path = "/api/auth/google"
        };

        Response.Cookies.Delete(GooglePkceVerifierCookie, cookieOptions);
        Response.Cookies.Delete(GoogleStateCookie, cookieOptions);
    }
}
