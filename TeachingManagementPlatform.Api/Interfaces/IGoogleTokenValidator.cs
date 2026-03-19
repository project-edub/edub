using Google.Apis.Auth;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface IGoogleTokenValidator
{
    Task<GoogleJsonWebSignature.Payload> ValidateAsync(string idToken);
}
