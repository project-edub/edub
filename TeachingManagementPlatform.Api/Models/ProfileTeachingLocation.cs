namespace TeachingManagementPlatform.Api.Models;

public class ProfileTeachingLocation
{
    public int Id { get; set; }
    public int ProfileId { get; set; }
    public string Value { get; set; } = string.Empty;
    public int SortOrder { get; set; }

    public LecturerProfile Profile { get; set; } = null!;
}
