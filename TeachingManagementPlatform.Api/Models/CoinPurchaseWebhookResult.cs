namespace TeachingManagementPlatform.Api.Models;

public class CoinPurchaseWebhookResult
{
    public long OrderCode { get; set; }
    public string Status { get; set; } = string.Empty;
    public int CoinAmount { get; set; }
    public int CoinBalance { get; set; }
}