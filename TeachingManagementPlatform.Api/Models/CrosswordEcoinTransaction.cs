namespace TeachingManagementPlatform.Api.Models;

public class CrosswordEcoinTransaction
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int GameId { get; set; }
    public int EcoinsSpent { get; set; }
    public string Action { get; set; } = "generate"; // "generate" | "regenerate"
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public CrosswordGame Game { get; set; } = null!;
}
