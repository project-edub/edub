namespace TeachingManagementPlatform.Api.Models;

public class PublicLecturerProfile
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Introduction { get; set; }
    public string? AvatarUrl { get; set; }
    public List<PublicTeachingLocation> TeachingLocations { get; set; } = new();
    public List<PublicExpertise> Expertises { get; set; } = new();
    public List<PublicExperience> Experiences { get; set; } = new();
    public List<PublicTeachingSkill> TeachingSkills { get; set; } = new();
    public List<PublicNote> Notes { get; set; } = new();
}

public class PublicTeachingLocation
{
    public string Value { get; set; } = string.Empty;
}

public class PublicExpertise
{
    public string Specialty { get; set; } = string.Empty;
    public string Degree { get; set; } = string.Empty;
    public string? CertificateImageUrl { get; set; }
}

public class PublicExperience
{
    public string Description { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
}

public class PublicTeachingSkill
{
    public string Description { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
}

public class PublicNote
{
    public string Content { get; set; } = string.Empty;
}