using System.ComponentModel.DataAnnotations;

namespace TeachingManagementPlatform.Api.Models;

public class GoogleLoginRequest
{
    public string? IdToken { get; set; }

    public string? AccessToken { get; set; }
}
