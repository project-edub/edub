namespace TeachingManagementPlatform.Api.Models;

public class UpdateProfileRequest
{
    public string? FullName { get; set; }
    public string? Introduction { get; set; }
    public List<OccupationDto>? Occupations { get; set; }
    public List<TeachingLocationDto>? TeachingLocations { get; set; }
    public List<ExpertiseDto>? Expertises { get; set; }
    public List<ExperienceDto>? Experiences { get; set; }
    public List<TeachingSkillDto>? TeachingSkills { get; set; }
    public List<TuitionFeeDto>? TuitionFees { get; set; }
    public List<NoteDto>? Notes { get; set; }
}
