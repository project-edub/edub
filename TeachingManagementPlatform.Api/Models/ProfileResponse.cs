namespace TeachingManagementPlatform.Api.Models;

public class ProfileResponse
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Introduction { get; set; }
    public string? AvatarUrl { get; set; }
    public List<TeachingLocationDto> TeachingLocations { get; set; } = new();
    public List<ExpertiseDto> Expertises { get; set; } = new();
    public List<ExperienceDto> Experiences { get; set; } = new();
    public List<TeachingSkillDto> TeachingSkills { get; set; } = new();
    public List<NoteDto> Notes { get; set; } = new();
}

public class TeachingLocationDto
{
    public string Value { get; set; } = string.Empty;
}

public class ExpertiseDto
{
    public string Specialty { get; set; } = string.Empty;
    public string Degree { get; set; } = string.Empty;
    public string? CertificateImageUrl { get; set; }
}

public class ExperienceDto
{
    public string Description { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
}

public class TeachingSkillDto
{
    public string Description { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
}

public class NoteDto
{
    public string Content { get; set; } = string.Empty;
}
