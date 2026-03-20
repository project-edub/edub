using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
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

    public AuthService(ApplicationDbContext context, IConfiguration configuration, IGoogleTokenValidator googleTokenValidator)
    {
        _context = context;
        _configuration = configuration;
        _googleTokenValidator = googleTokenValidator;
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
        Google.Apis.Auth.GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await _googleTokenValidator.ValidateAsync(request.IdToken);
        }
        catch (Exception)
        {
            throw new GoogleAuthException("Xác thực Google thất bại. Vui lòng thử lại.");
        }

        var googleId = payload.Subject;
        var email = payload.Email;
        var fullName = payload.Name ?? email;

        // Look up by GoogleId first
        var user = await _context.Users.FirstOrDefaultAsync(u => u.GoogleId == googleId);

        if (user == null)
        {
            // Look up by email
            user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);

            if (user != null)
            {
                // Link GoogleId to existing account
                user.GoogleId = googleId;
                user.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                // Create new user
                user = new User
                {
                    Email = email,
                    PasswordHash = null,
                    FullName = fullName,
                    Role = "Lecturer",
                    GoogleId = googleId,
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

    private string GenerateJwtToken(User user)
    {
        var jwtSettings = _configuration.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));
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
