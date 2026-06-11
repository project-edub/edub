namespace TeachingManagementPlatform.Api.Models;

public class CoinWalletResponse
{
    public int CoinBalance { get; set; }
    public int FreeEcoinBalance { get; set; }
    public string? SubscriptionPackageName { get; set; }
    public decimal? SubscriptionPackagePrice { get; set; }
    public DateTime? SubscriptionExpiresAt { get; set; }
}