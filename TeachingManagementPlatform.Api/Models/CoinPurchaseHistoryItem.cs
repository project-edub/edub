namespace TeachingManagementPlatform.Api.Models;

public class CoinPurchaseHistoryItem
{
    public int Id { get; set; }
    public long OrderCode { get; set; }
    public decimal Amount { get; set; }
    public int CoinAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? PaidAt { get; set; }
}
