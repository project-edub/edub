using System.IdentityModel.Tokens.Jwt;
using System.Net.Http;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IGoogleTokenValidator _googleTokenValidator;
    private readonly IHttpClientFactory _httpClientFactory;

    public AuthService(
        ApplicationDbContext context,
        IConfiguration configuration,
        IGoogleTokenValidator googleTokenValidator,
        IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _configuration = configuration;
        _googleTokenValidator = googleTokenValidator;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);

        if (user == null || user.PasswordHash == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Tên đăng nhập hoặc mật khẩu không đúng");
        }

        if (user.Status == "Inactive")
        {
            throw new AccountInactiveException("Tài khoản đã bị vô hiệu hóa");
        }

        var token = GenerateJwtToken(user);
        return new AuthResponse { Token = token, Role = user.Role };
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        var emailExists = await _context.Users.AnyAsync(u => u.Email == request.Email);
        if (emailExists)
        {
            throw new EmailAlreadyExistsException("Email đã được sử dụng");
        }

        var user = new User
        {
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = request.FullName,
            Role = "Lecturer",
            Status = "Active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var token = GenerateJwtToken(user);
        return new AuthResponse { Token = token, Role = user.Role };
    }

    public async Task<AuthResponse> GoogleLoginAsync(GoogleLoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.IdToken) && string.IsNullOrWhiteSpace(request.AccessToken))
        {
            throw new GoogleAuthException("Thiếu thông tin xác thực Google. Vui lòng thử lại.");
        }

        GoogleUserInfo googleUser;
        try
        {
            if (!string.IsNullOrWhiteSpace(request.AccessToken))
            {
                googleUser = await GetGoogleUserInfoAsync(request.AccessToken);
            }
            else
            {
                var payload = await _googleTokenValidator.ValidateAsync(request.IdToken!);
                googleUser = new GoogleUserInfo
                {
                    Subject = payload.Subject,
                    Email = payload.Email,
                    Name = payload.Name,
                };
            }
        }
        catch (Exception)
        {
            throw new GoogleAuthException("Xác thực Google thất bại. Vui lòng thử lại.");
        }

        return await CompleteGoogleLoginAsync(googleUser);
    }

    public async Task<AuthResponse> GoogleLoginFromCodeAsync(string code, string codeVerifier)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            throw new GoogleAuthException("Thiếu mã xác thực Google. Vui lòng thử lại.");
        }

        if (string.IsNullOrWhiteSpace(codeVerifier))
        {
            throw new GoogleAuthException("Thiếu mã xác minh Google. Vui lòng thử lại.");
        }

        var redirectUri = _configuration["Google:RedirectUri"]
            ?? throw new InvalidOperationException("Google:RedirectUri is not configured");

        var clientId = _configuration["Google:ClientId"]
            ?? throw new InvalidOperationException("Google:ClientId is not configured");

        var client = _httpClientFactory.CreateClient();
        var clientSecret = _configuration["Google:ClientSecret"]
            ?? throw new InvalidOperationException("Google:ClientSecret is not configured");

        var form = new Dictionary<string, string>
        {
            ["code"] = code,
            ["client_id"] = clientId,
            ["redirect_uri"] = redirectUri,
            ["code_verifier"] = codeVerifier,
            ["grant_type"] = "authorization_code",
        };

        form["client_secret"] = clientSecret;

        var tokenRequest = new HttpRequestMessage(HttpMethod.Post, "https://oauth2.googleapis.com/token")
        {
            Content = new FormUrlEncodedContent(form)
        };

        using var tokenResponse = await client.SendAsync(tokenRequest);
        if (!tokenResponse.IsSuccessStatusCode)
        {
            throw new GoogleAuthException(await ReadGoogleErrorMessageAsync(tokenResponse));
        }

        var tokenPayload = await tokenResponse.Content.ReadFromJsonAsync<GoogleTokenExchangeResponse>();
        if (tokenPayload == null || string.IsNullOrWhiteSpace(tokenPayload.AccessToken))
        {
            throw new GoogleAuthException("Google không trả về thông tin tài khoản hợp lệ.");
        }

        var googleUser = await GetGoogleUserInfoAsync(tokenPayload.AccessToken);
        var response = await CompleteGoogleLoginAsync(googleUser);
        response.GoogleAccessToken = tokenPayload.AccessToken;
        return response;
    }

    private async Task<GoogleUserInfo> GetGoogleUserInfoAsync(string accessToken)
    {
        var client = _httpClientFactory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "https://www.googleapis.com/oauth2/v3/userinfo");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

        using var response = await client.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            throw new GoogleAuthException(await ReadGoogleErrorMessageAsync(response));
        }

        var userInfo = await response.Content.ReadFromJsonAsync<GoogleUserInfo>();
        if (userInfo == null)
        {
            throw new GoogleAuthException("Google không trả về thông tin tài khoản hợp lệ.");
        }

        return userInfo;
    }

    private static async Task<string> ReadGoogleErrorMessageAsync(HttpResponseMessage response)
    {
        var rawBody = await response.Content.ReadAsStringAsync();

        if (string.IsNullOrWhiteSpace(rawBody))
        {
            return "Xác thực Google thất bại. Vui lòng thử lại.";
        }

        try
        {
            using var document = JsonDocument.Parse(rawBody);
            var root = document.RootElement;

            if (root.TryGetProperty("error_description", out var descriptionElement) &&
                descriptionElement.ValueKind == JsonValueKind.String &&
                !string.IsNullOrWhiteSpace(descriptionElement.GetString()))
            {
                return $"Xác thực Google thất bại: {descriptionElement.GetString()}";
            }

            if (root.TryGetProperty("error", out var errorElement) &&
                errorElement.ValueKind == JsonValueKind.String &&
                !string.IsNullOrWhiteSpace(errorElement.GetString()))
            {
                return $"Xác thực Google thất bại: {errorElement.GetString()}";
            }
        }
        catch (JsonException)
        {
            // Fall through to raw body.
        }

        return $"Xác thực Google thất bại: {rawBody}";
    }

    private async Task<AuthResponse> CompleteGoogleLoginAsync(GoogleUserInfo googleUser)
    {
        var googleId = googleUser.Subject;
        var email = googleUser.Email;

        if (string.IsNullOrWhiteSpace(googleId) || string.IsNullOrWhiteSpace(email))
        {
            throw new GoogleAuthException("Google không trả về thông tin tài khoản hợp lệ.");
        }

        var verifiedGoogleId = googleId;
        var verifiedEmail = email;
        var fullName = googleUser.Name ?? verifiedEmail;

        var user = await _context.Users.FirstOrDefaultAsync(u => u.GoogleId == verifiedGoogleId);

        if (user == null)
        {
            user = await _context.Users.FirstOrDefaultAsync(u => u.Email == verifiedEmail);

            if (user != null)
            {
                user.GoogleId = verifiedGoogleId;
                user.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                user = new User
                {
                    Email = verifiedEmail,
                    PasswordHash = null,
                    FullName = fullName,
                    Role = "Lecturer",
                    GoogleId = verifiedGoogleId,
                    Status = "Active",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.Users.Add(user);
            }

            await _context.SaveChangesAsync();
        }

        if (user.Status == "Inactive")
        {
            throw new AccountInactiveException("Tài khoản đã bị vô hiệu hóa");
        }

        var token = GenerateJwtToken(user);
        return new AuthResponse { Token = token, Role = user.Role };
    }

    public static string GeneratePkceCodeVerifier()
    {
        Span<byte> bytes = stackalloc byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Base64UrlEncode(bytes);
    }

    public static string GeneratePkceCodeChallenge(string codeVerifier)
    {
        var verifierBytes = Encoding.ASCII.GetBytes(codeVerifier);
        var hash = SHA256.HashData(verifierBytes);
        return Base64UrlEncode(hash);
    }

    public static string GenerateOAuthState()
    {
        Span<byte> bytes = stackalloc byte[16];
        RandomNumberGenerator.Fill(bytes);
        return Base64UrlEncode(bytes);
    }

    private static string Base64UrlEncode(ReadOnlySpan<byte> data)
    {
        var base64 = Convert.ToBase64String(data);
        return base64.Replace('+', '-').Replace('/', '_').TrimEnd('=');
    }

    private string GenerateJwtToken(User user)
    {
        var jwtSettings = _configuration.GetSection("Jwt");
        var secretKey = jwtSettings["SecretKey"] ?? jwtSettings["Key"];

        if (string.IsNullOrWhiteSpace(secretKey))
        {
            throw new InvalidOperationException("Jwt:SecretKey is not configured");
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("role", user.Role)
        };

        var expirationMinutes = int.Parse(jwtSettings["ExpirationMinutes"] ?? "1440");

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public class GoogleUserInfo
{
    [JsonPropertyName("sub")]
    public string? Subject { get; set; }

    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }
}

public class GoogleTokenExchangeResponse
{
    [JsonPropertyName("access_token")]
    public string? AccessToken { get; set; }

    [JsonPropertyName("id_token")]
    public string? IdToken { get; set; }
}

public class AccountInactiveException : Exception
{
    public AccountInactiveException(string message) : base(message) { }
}

public class EmailAlreadyExistsException : Exception
{
    public EmailAlreadyExistsException(string message) : base(message) { }
}

public class GoogleAuthException : Exception
{
    public GoogleAuthException(string message) : base(message) { }
}
