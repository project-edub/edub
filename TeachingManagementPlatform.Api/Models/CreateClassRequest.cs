using System.ComponentModel.DataAnnotations;

namespace TeachingManagementPlatform.Api.Models;

public class CreateClassRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Year { get; set; } = string.Empty;
}
