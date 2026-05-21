using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> GoogleLoginAsync(GoogleLoginRequest request);
    Task<AuthResponse> GoogleLoginFromCodeAsync(string code, string codeVerifier);
}
