namespace TeachingManagementPlatform.Api.Models;

public class SubscriptionPackage
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public long StorageLimitBytes { get; set; }
    public int MaxFilesPerQuizGeneration { get; set; }
    public int MaxQuestionsPerQuiz { get; set; }
    public int MaxCrosswordFilesPerGeneration { get; set; }
    public int MaxCrosswordWordsPerGeneration { get; set; }
    public int MaxCrosswordGenerationsPerDay { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;
    public List<string> UnlockedFeatures { get; set; } = new();
    /// <summary>
    /// Discount percentages when upgrading FROM another package TO this package.
    /// Key: source package ID (0 = free/no package), Value: discount percent (0-100)
    /// </summary>
    public Dictionary<int, int>? UpgradeDiscounts { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
