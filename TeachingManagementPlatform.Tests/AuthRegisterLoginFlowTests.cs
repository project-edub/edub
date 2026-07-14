using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Google.Apis.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Tests;

/// <summary>
/// Integration tests for the "Register → Login immediately" flow.
/// Validates: Requirement 4 - Sửa lỗi đăng nhập sau khi tạo tài khoản
/// </summary>
public class AuthRegisterLoginFlowTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly AuthService _authService;

    public AuthRegisterLoginFlowTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new ApplicationDbContext(options);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:SecretKey"] = "TestSecretKeyThatIsLongEnoughForHmacSha256Algorithm12345678",
                ["Jwt:Issuer"] = "TestIssuer",
                ["Jwt:Audience"] = "TestAudience",
                ["Jwt:ExpirationMinutes"] = "60",
            })
            .Build();

        var googleValidator = new StubGoogleTokenValidator();
        var httpClientFactory = new StubHttpClientFactory();

        _authService = new AuthService(_context, config, googleValidator, httpClientFactory);
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task Register_Then_Login_Succeeds()
    {
        // Arrange
        var registerRequest = new RegisterRequest
        {
            Email = "newuser@test.com",
            Password = "Password123",
            FullName = "New User"
        };

        // Act - Register
        var registerResponse = await _authService.RegisterAsync(registerRequest);

        // Act - Login immediately after register
        var loginRequest = new LoginRequest
        {
            Email = "newuser@test.com",
            Password = "Password123"
        };
        var loginResponse = await _authService.LoginAsync(loginRequest);

        // Assert
        Assert.NotNull(loginResponse);
        Assert.NotEmpty(loginResponse.Token);
        Assert.Equal("Lecturer", loginResponse.Role);
    }

    [Fact]
    public async Task Register_Sets_Status_Active()
    {
        // Arrange
        var registerRequest = new RegisterRequest
        {
            Email = "activeuser@test.com",
            Password = "Password123",
            FullName = "Active User"
        };

        // Act
        await _authService.RegisterAsync(registerRequest);

        // Assert - check the database directly
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == "activeuser@test.com");
        Assert.NotNull(user);
        Assert.Equal("Active", user.Status);
    }

    [Fact]
    public async Task Login_AfterRegister_ReturnsValidJwt()
    {
        // Arrange
        var registerRequest = new RegisterRequest
        {
            Email = "jwtuser@test.com",
            Password = "Password123",
            FullName = "JWT User"
        };

        await _authService.RegisterAsync(registerRequest);

        var loginRequest = new LoginRequest
        {
            Email = "jwtuser@test.com",
            Password = "Password123"
        };

        // Act
        var loginResponse = await _authService.LoginAsync(loginRequest);

        // Assert - decode the JWT and verify claims
        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(loginResponse.Token);

        var emailClaim = jwt.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Email);
        Assert.NotNull(emailClaim);
        Assert.Equal("jwtuser@test.com", emailClaim.Value);

        var roleClaim = jwt.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Role || c.Type == "role");
        Assert.NotNull(roleClaim);
        Assert.Equal("Lecturer", roleClaim.Value);
    }

    [Fact]
    public async Task Login_WithWrongPassword_AfterRegister_ThrowsUnauthorized()
    {
        // Arrange
        var registerRequest = new RegisterRequest
        {
            Email = "wrongpwd@test.com",
            Password = "CorrectPassword123",
            FullName = "Wrong Pwd User"
        };

        await _authService.RegisterAsync(registerRequest);

        var loginRequest = new LoginRequest
        {
            Email = "wrongpwd@test.com",
            Password = "WrongPassword999"
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _authService.LoginAsync(loginRequest));
        Assert.Equal("Sai mật khẩu", ex.Message);
    }

    [Fact]
    public async Task Login_GoogleOnlyAccount_ThrowsGoogleOnlyException()
    {
        // Arrange - create a user with null PasswordHash (Google-only)
        var user = new User
        {
            Email = "googleonly@test.com",
            PasswordHash = null,
            FullName = "Google Only User",
            Role = "Lecturer",
            GoogleId = "google-id-123",
            Status = "Active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var loginRequest = new LoginRequest
        {
            Email = "googleonly@test.com",
            Password = "AnyPassword123"
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<GoogleOnlyAccountException>(
            () => _authService.LoginAsync(loginRequest));
        Assert.Equal("Tài khoản này được đăng ký qua Google. Vui lòng đăng nhập bằng Google.", ex.Message);
    }

    [Fact]
    public async Task Login_InactiveAccount_ThrowsAccountInactive()
    {
        // Arrange - create a user with Status = "Inactive"
        var user = new User
        {
            Email = "inactive@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password123"),
            FullName = "Inactive User",
            Role = "Lecturer",
            Status = "Inactive",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var loginRequest = new LoginRequest
        {
            Email = "inactive@test.com",
            Password = "Password123"
        };

        // Act & Assert
        var ex = await Assert.ThrowsAsync<AccountInactiveException>(
            () => _authService.LoginAsync(loginRequest));
        Assert.Equal("Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.", ex.Message);
    }

    // ── Stub implementations ──

    private class StubGoogleTokenValidator : IGoogleTokenValidator
    {
        public Task<GoogleJsonWebSignature.Payload> ValidateAsync(string idToken)
        {
            throw new NotImplementedException("Google token validation is not used in email/password tests.");
        }
    }

    private class StubHttpClientFactory : IHttpClientFactory
    {
        public HttpClient CreateClient(string name)
        {
            return new HttpClient();
        }
    }
}
