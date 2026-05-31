namespace TeachingManagementPlatform.Api.Models;

public class CoinPurchaseCheckoutResponse
{
    public long OrderCode { get; set; }
    public string CheckoutUrl { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public CoinPackageResponse Package { get; set; } = new();
}