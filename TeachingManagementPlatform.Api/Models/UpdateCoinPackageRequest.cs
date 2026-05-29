namespace TeachingManagementPlatform.Api.Models;

public class UpdateCoinPackageRequest
{
    public string? Name { get; set; }
    public decimal? Price { get; set; }
    public int? CoinAmount { get; set; }
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
}