namespace TeachingManagementPlatform.Api.Models;

public class UpdateSubscriptionPackageRequest
{
    public string? Name { get; set; }
    public decimal? Price { get; set; }
    public long? StorageLimitBytes { get; set; }
    public int? MaxFilesPerQuizGeneration { get; set; }
    public int? MaxQuestionsPerQuiz { get; set; }
    public int? MaxCrosswordFilesPerGeneration { get; set; }
    public int? MaxCrosswordWordsPerGeneration { get; set; }
    public int? MaxCrosswordGenerationsPerDay { get; set; }
    public bool? IsDefault { get; set; }
    public bool? IsActive { get; set; }
    public List<string>? UnlockedFeatures { get; set; }
}
