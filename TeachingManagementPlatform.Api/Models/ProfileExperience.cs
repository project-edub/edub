namespace TeachingManagementPlatform.Api.Models;

public class ProfileExperience
{
    public int Id { get; set; }
    public int ProfileId { get; set; }
    public string Description { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public int SortOrder { get; set; }

    public LecturerProfile Profile { get; set; } = null!;
}
