namespace TeachingManagementPlatform.Api.Models;

public class UpdateSubscriptionPackageRequest
{
    public string? Name { get; set; }
    public decimal? Price { get; set; }
    public long? StorageLimitBytes { get; set; }
    public int? MaxFilesPerQuizGeneration { get; set; }
    public int? MaxQuestionsPerQuiz { get; set; }
    public bool? IsDefault { get; set; }
    public List<string>? UnlockedFeatures { get; set; }
}
