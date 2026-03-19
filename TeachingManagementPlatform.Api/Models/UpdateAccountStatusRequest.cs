using System.ComponentModel.DataAnnotations;

namespace TeachingManagementPlatform.Api.Models;

public class UpdateAccountStatusRequest
{
    [Required]
    [RegularExpression("^(Active|Inactive)$", ErrorMessage = "Status must be 'Active' or 'Inactive'")]
    public string Status { get; set; } = string.Empty;
}
