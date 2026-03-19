namespace TeachingManagementPlatform.Api.Models;

public class SubscriptionPackageResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public long StorageLimitBytes { get; set; }
    public List<string> UnlockedFeatures { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
