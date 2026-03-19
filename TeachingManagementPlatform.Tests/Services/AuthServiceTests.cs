using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Google.Apis.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Tests.Services;

public class FakeGoogleTokenValidator : IGoogleTokenValidator
{
    private readonly Func<string, Task<GoogleJsonWebSignature.Payload>>? _validateFunc;

    public FakeGoogleTokenValidator(Func<string, Task<GoogleJsonWebSignature.Payload>>? validateFunc = null)
    {
        _validateFunc = validateFunc;
    }

    public Task<GoogleJsonWebSignature.Payload> ValidateAsync(string idToken)
    {
        if (_validateFunc != null)
            return _validateFunc(idToken);

        throw new InvalidOperationException("Google token validation not configured");
    }
}

public class AuthServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly AuthService _authService;
    private readonly IConfiguration _config;

    public AuthServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"AuthTest_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);

        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = "YourSuperSecretKeyThatIsAtLeast32Characters!",
                ["Jwt:Issuer"] = "TeachingManagementPlatform",
                ["Jwt:Audience"] = "TeachingManagementPlatform",
                ["Jwt:ExpirationMinutes"] = "1440"
            })
            .Build();

        _authService = new AuthService(_context, _config, new FakeGoogleTokenValidator());
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    [Fact]
    public async Task RegisterAsync_CreatesUser_WithHashedPassword()
    {
        var request = new RegisterRequest
        {
            Email = "test@example.com",
            Password = "password123",
            FullName = "Test User"
        };

        var response = await _authService.RegisterAsync(request);

        Assert.NotEmpty(response.Token);
        Assert.Equal("Lecturer", response.Role);

        var user = await _context.Users.FirstAsync(u => u.Email == "test@example.com");
        Assert.NotEqual("password123", user.PasswordHash);
        Assert.True(BCrypt.Net.BCrypt.Verify("password123", user.PasswordHash));
    }

    [Fact]
    public async Task RegisterAsync_SetsRoleToLecturer_AndStatusToActive()
    {
        var request = new RegisterRequest
        {
            Email = "lecturer@example.com",
            Password = "password123",
            FullName = "New Lecturer"
        };

        await _authService.RegisterAsync(request);

        var user = await _context.Users.FirstAsync(u => u.Email == "lecturer@example.com");
        Assert.Equal("Lecturer", user.Role);
        Assert.Equal("Active", user.Status);
    }

    [Fact]
    public async Task RegisterAsync_ThrowsEmailAlreadyExists_WhenDuplicateEmail()
    {
        _context.Users.Add(new User
        {
            Email = "existing@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass"),
            FullName = "Existing",
            Role = "Lecturer",
            Status = "Active"
        });
        await _context.SaveChangesAsync();

        var request = new RegisterRequest
        {
            Email = "existing@example.com",
            Password = "password123",
            FullName = "Duplicate"
        };

        await Assert.ThrowsAsync<EmailAlreadyExistsException>(
            () => _authService.RegisterAsync(request));
    }

    [Fact]
    public async Task LoginAsync_ReturnsToken_WithCorrectRole()
    {
        _context.Users.Add(new User
        {
            Email = "admin@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("adminpass"),
            FullName = "Admin User",
            Role = "Admin",
            Status = "Active"
        });
        await _context.SaveChangesAsync();

        var request = new LoginRequest { Email = "admin@example.com", Password = "adminpass" };
        var response = await _authService.LoginAsync(request);

        Assert.NotEmpty(response.Token);
        Assert.Equal("Admin", response.Role);

        // Verify JWT contains correct role claim
        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(response.Token);
        var roleClaim = jwt.Claims.First(c => c.Type == ClaimTypes.Role || c.Type == "role");
        Assert.Equal("Admin", roleClaim.Value);
    }

    [Fact]
    public async Task LoginAsync_ThrowsUnauthorized_WhenEmailNotFound()
    {
        var request = new LoginRequest { Email = "nobody@example.com", Password = "pass" };

        var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _authService.LoginAsync(request));
        Assert.Equal("Tên đăng nhập hoặc mật khẩu không đúng", ex.Message);
    }

    [Fact]
    public async Task LoginAsync_ThrowsUnauthorized_WhenPasswordWrong()
    {
        _context.Users.Add(new User
        {
            Email = "user@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("correctpass"),
            FullName = "User",
            Role = "Lecturer",
            Status = "Active"
        });
        await _context.SaveChangesAsync();

        var request = new LoginRequest { Email = "user@example.com", Password = "wrongpass" };

        var ex = await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _authService.LoginAsync(request));
        Assert.Equal("Tên đăng nhập hoặc mật khẩu không đúng", ex.Message);
    }

    [Fact]
    public async Task LoginAsync_SameErrorMessage_ForWrongEmail_AndWrongPassword()
    {
        _context.Users.Add(new User
        {
            Email = "real@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("realpass"),
            FullName = "Real User",
            Role = "Lecturer",
            Status = "Active"
        });
        await _context.SaveChangesAsync();

        var wrongEmail = await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _authService.LoginAsync(new LoginRequest { Email = "fake@example.com", Password = "realpass" }));

        var wrongPassword = await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _authService.LoginAsync(new LoginRequest { Email = "real@example.com", Password = "fakepass" }));

        Assert.Equal(wrongEmail.Message, wrongPassword.Message);
    }

    [Fact]
    public async Task LoginAsync_ThrowsAccountInactive_WhenStatusIsInactive()
    {
        _context.Users.Add(new User
        {
            Email = "inactive@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass123"),
            FullName = "Inactive User",
            Role = "Lecturer",
            Status = "Inactive"
        });
        await _context.SaveChangesAsync();

        var request = new LoginRequest { Email = "inactive@example.com", Password = "pass123" };

        var ex = await Assert.ThrowsAsync<AccountInactiveException>(
            () => _authService.LoginAsync(request));
        Assert.Equal("Tài khoản đã bị vô hiệu hóa", ex.Message);
    }

    [Fact]
    public async Task LoginAsync_JwtContainsSubAndEmailClaims()
    {
        _context.Users.Add(new User
        {
            Email = "claims@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass"),
            FullName = "Claims User",
            Role = "Lecturer",
            Status = "Active"
        });
        await _context.SaveChangesAsync();

        var response = await _authService.LoginAsync(
            new LoginRequest { Email = "claims@example.com", Password = "pass" });

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(response.Token);

        Assert.Contains(jwt.Claims, c => c.Type == JwtRegisteredClaimNames.Sub);
        Assert.Contains(jwt.Claims, c => c.Type == JwtRegisteredClaimNames.Email && c.Value == "claims@example.com");
    }

    // --- Google OAuth Tests ---

    private AuthService CreateServiceWithGoogleValidator(FakeGoogleTokenValidator validator)
    {
        return new AuthService(_context, _config, validator);
    }

    [Fact]
    public async Task GoogleLoginAsync_CreatesNewUser_WhenNoExistingAccount()
    {
        var validator = new FakeGoogleTokenValidator(_ => Task.FromResult(new GoogleJsonWebSignature.Payload
        {
            Subject = "google-123",
            Email = "newgoogle@example.com",
            Name = "Google User"
        }));
        var service = CreateServiceWithGoogleValidator(validator);

        var response = await service.GoogleLoginAsync(new GoogleLoginRequest { IdToken = "valid-token" });

        Assert.NotEmpty(response.Token);
        Assert.Equal("Lecturer", response.Role);

        var user = await _context.Users.FirstAsync(u => u.Email == "newgoogle@example.com");
        Assert.Equal("google-123", user.GoogleId);
        Assert.Equal("Google User", user.FullName);
        Assert.Equal("Lecturer", user.Role);
        Assert.Equal("Active", user.Status);
        Assert.Null(user.PasswordHash);
    }

    [Fact]
    public async Task GoogleLoginAsync_LinksGoogleId_WhenEmailExists()
    {
        _context.Users.Add(new User
        {
            Email = "existing@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass"),
            FullName = "Existing User",
            Role = "Lecturer",
            Status = "Active"
        });
        await _context.SaveChangesAsync();

        var validator = new FakeGoogleTokenValidator(_ => Task.FromResult(new GoogleJsonWebSignature.Payload
        {
            Subject = "google-456",
            Email = "existing@example.com",
            Name = "Existing User"
        }));
        var service = CreateServiceWithGoogleValidator(validator);

        var response = await service.GoogleLoginAsync(new GoogleLoginRequest { IdToken = "valid-token" });

        Assert.NotEmpty(response.Token);
        Assert.Equal("Lecturer", response.Role);

        var user = await _context.Users.FirstAsync(u => u.Email == "existing@example.com");
        Assert.Equal("google-456", user.GoogleId);
        // Password should still be intact
        Assert.NotNull(user.PasswordHash);
    }

    [Fact]
    public async Task GoogleLoginAsync_ReturnsToken_WhenGoogleIdAlreadyLinked()
    {
        _context.Users.Add(new User
        {
            Email = "linked@example.com",
            PasswordHash = null,
            FullName = "Linked User",
            Role = "Admin",
            GoogleId = "google-789",
            Status = "Active"
        });
        await _context.SaveChangesAsync();

        var validator = new FakeGoogleTokenValidator(_ => Task.FromResult(new GoogleJsonWebSignature.Payload
        {
            Subject = "google-789",
            Email = "linked@example.com",
            Name = "Linked User"
        }));
        var service = CreateServiceWithGoogleValidator(validator);

        var response = await service.GoogleLoginAsync(new GoogleLoginRequest { IdToken = "valid-token" });

        Assert.NotEmpty(response.Token);
        Assert.Equal("Admin", response.Role);
    }

    [Fact]
    public async Task GoogleLoginAsync_ThrowsGoogleAuthException_WhenTokenInvalid()
    {
        var validator = new FakeGoogleTokenValidator(_ =>
            throw new InvalidJwtException("Invalid token"));
        var service = CreateServiceWithGoogleValidator(validator);

        var ex = await Assert.ThrowsAsync<GoogleAuthException>(
            () => service.GoogleLoginAsync(new GoogleLoginRequest { IdToken = "bad-token" }));
        Assert.Equal("Xác thực Google thất bại. Vui lòng thử lại.", ex.Message);
    }

    [Fact]
    public async Task GoogleLoginAsync_ThrowsAccountInactive_WhenUserIsInactive()
    {
        _context.Users.Add(new User
        {
            Email = "inactive-google@example.com",
            PasswordHash = null,
            FullName = "Inactive Google User",
            Role = "Lecturer",
            GoogleId = "google-inactive",
            Status = "Inactive"
        });
        await _context.SaveChangesAsync();

        var validator = new FakeGoogleTokenValidator(_ => Task.FromResult(new GoogleJsonWebSignature.Payload
        {
            Subject = "google-inactive",
            Email = "inactive-google@example.com",
            Name = "Inactive Google User"
        }));
        var service = CreateServiceWithGoogleValidator(validator);

        var ex = await Assert.ThrowsAsync<AccountInactiveException>(
            () => service.GoogleLoginAsync(new GoogleLoginRequest { IdToken = "valid-token" }));
        Assert.Equal("Tài khoản đã bị vô hiệu hóa", ex.Message);
    }

    [Fact]
    public async Task GoogleLoginAsync_JwtContainsCorrectRoleClaim()
    {
        var validator = new FakeGoogleTokenValidator(_ => Task.FromResult(new GoogleJsonWebSignature.Payload
        {
            Subject = "google-jwt-test",
            Email = "jwttest@example.com",
            Name = "JWT Test"
        }));
        var service = CreateServiceWithGoogleValidator(validator);

        var response = await service.GoogleLoginAsync(new GoogleLoginRequest { IdToken = "valid-token" });

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(response.Token);
        var roleClaim = jwt.Claims.First(c => c.Type == ClaimTypes.Role || c.Type == "role");
        Assert.Equal("Lecturer", roleClaim.Value);
    }
}
