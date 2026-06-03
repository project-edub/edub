namespace TeachingManagementPlatform.Api.Models;

public class CrosswordWord
{
    public int Id { get; set; }
    public int GameId { get; set; }
    public string Word { get; set; } = string.Empty;
    public string DisplayWord { get; set; } = string.Empty;
    public string Clue { get; set; } = string.Empty;
    public string Direction { get; set; } = "across";
    public int StartRow { get; set; }
    public int StartCol { get; set; }
    public int Number { get; set; }
    public string Difficulty { get; set; } = string.Empty;
    public string? SourceContext { get; set; }

    public CrosswordGame Game { get; set; } = null!;
}
