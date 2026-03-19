namespace TeachingManagementPlatform.Api.Models;

public class LecturerProfile
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Introduction { get; set; }
    public string? AvatarUrl { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
    public ICollection<ProfileOccupation> Occupations { get; set; } = new List<ProfileOccupation>();
    public ICollection<ProfileTeachingLocation> TeachingLocations { get; set; } = new List<ProfileTeachingLocation>();
    public ICollection<ProfileExpertise> Expertises { get; set; } = new List<ProfileExpertise>();
    public ICollection<ProfileExperience> Experiences { get; set; } = new List<ProfileExperience>();
    public ICollection<ProfileTeachingSkill> TeachingSkills { get; set; } = new List<ProfileTeachingSkill>();
    public ICollection<ProfileTuitionFee> TuitionFees { get; set; } = new List<ProfileTuitionFee>();
    public ICollection<ProfileNote> Notes { get; set; } = new List<ProfileNote>();
}
