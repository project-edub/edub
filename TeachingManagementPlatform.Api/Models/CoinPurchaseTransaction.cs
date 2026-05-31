namespace TeachingManagementPlatform.Api.Models;

public class CoinPurchaseTransaction
{
    public int Id { get; set; }
    public long OrderCode { get; set; }
    public int UserId { get; set; }
    public int CoinPackageId { get; set; }
    public decimal Amount { get; set; }
    public int CoinAmount { get; set; }
    public string Status { get; set; } = "pending";
    public string? CheckoutUrl { get; set; }
    public string? PaymentLinkId { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public User User { get; set; } = null!;
    public CoinPackage CoinPackage { get; set; } = null!;
}