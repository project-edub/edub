using System.ComponentModel.DataAnnotations;

namespace TeachingManagementPlatform.Api.Models;

public class GoogleLoginRequest
{
    [Required]
    public string IdToken { get; set; } = string.Empty;
}
