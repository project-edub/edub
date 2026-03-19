namespace TeachingManagementPlatform.Api.Models;

public class ProfileExpertise
{
    public int Id { get; set; }
    public int ProfileId { get; set; }
    public string Specialty { get; set; } = string.Empty;
    public string Degree { get; set; } = string.Empty;
    public string? CertificateImageUrl { get; set; }
    public int SortOrder { get; set; }

    public LecturerProfile Profile { get; set; } = null!;
}
