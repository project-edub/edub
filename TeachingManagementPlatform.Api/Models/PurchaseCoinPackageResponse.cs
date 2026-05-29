namespace TeachingManagementPlatform.Api.Models;

public class PurchaseCoinPackageResponse
{
    public CoinPackageResponse Package { get; set; } = new();
    public int CoinBalance { get; set; }
}