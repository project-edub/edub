using Google.Apis.Auth;
using TeachingManagementPlatform.Api.Interfaces;

namespace TeachingManagementPlatform.Api.Services;

public class GoogleTokenValidator : IGoogleTokenValidator
{
    private readonly string _clientId;

    public GoogleTokenValidator(IConfiguration configuration)
    {
        _clientId = configuration["Google:ClientId"]
            ?? throw new InvalidOperationException("Google:ClientId is not configured");
    }

    public async Task<GoogleJsonWebSignature.Payload> ValidateAsync(string idToken)
    {
        var settings = new GoogleJsonWebSignature.ValidationSettings
        {
            Audience = new[] { _clientId }
        };

        return await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
    }
}
