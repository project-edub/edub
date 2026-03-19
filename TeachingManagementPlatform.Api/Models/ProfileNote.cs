namespace TeachingManagementPlatform.Api.Models;

public class ProfileNote
{
    public int Id { get; set; }
    public int ProfileId { get; set; }
    public string Content { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    public LecturerProfile Profile { get; set; } = null!;
}
