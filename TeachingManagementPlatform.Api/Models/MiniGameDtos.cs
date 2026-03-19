using System.ComponentModel.DataAnnotations;
using System.Text.Json;

namespace TeachingManagementPlatform.Api.Models;

public class CreateMiniGameRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    [Required]
    public string GameType { get; set; } = "Quiz";
}

public class MiniGameDetailResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Type { get; set; } = string.Empty;
    public JsonDocument? Content { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class MiniGamePlayResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public JsonDocument? Content { get; set; }
}
