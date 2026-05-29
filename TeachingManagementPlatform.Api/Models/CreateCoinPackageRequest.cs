using System.ComponentModel.DataAnnotations;

namespace TeachingManagementPlatform.Api.Models;

public class CreateCoinPackageRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    public decimal Price { get; set; }

    public int CoinAmount { get; set; }

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;
}