using System.ComponentModel.DataAnnotations;

namespace TeachingManagementPlatform.Api.Models;

public class CreateSubscriptionPackageRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    public decimal Price { get; set; }

    public long StorageLimitBytes { get; set; }

    public int MaxFilesPerQuizGeneration { get; set; }

    public int MaxQuestionsPerQuiz { get; set; }

    public bool IsDefault { get; set; }

    public List<string> UnlockedFeatures { get; set; } = new();
}
