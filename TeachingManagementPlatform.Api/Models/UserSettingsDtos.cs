using System.ComponentModel.DataAnnotations;

namespace TeachingManagementPlatform.Api.Models;

public class UpdateUserSettingsRequest
{
    [Required]
    [RegularExpression(@"^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$", ErrorMessage = "Mã màu HEX không hợp lệ.")]
    public string ThemeColor { get; set; } = string.Empty;
}

public class UpdateOnboardingRequest
{
    [Required]
    public bool Completed { get; set; }
}

public class UserSettingsResponse
{
    public string? ThemeColor { get; set; }
    public bool OnboardingCompleted { get; set; }
}
