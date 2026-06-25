using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

public class ProfileService : IProfileService
{
    private readonly ApplicationDbContext _context;

    public ProfileService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ProfileResponse> GetProfileAsync(int userId)
    {
        var profile = await _context.LecturerProfiles
            .Include(p => p.TeachingLocations.OrderBy(t => t.SortOrder))
            .Include(p => p.Expertises.OrderBy(e => e.SortOrder))
            .Include(p => p.Experiences.OrderBy(e => e.SortOrder))
            .Include(p => p.TeachingSkills.OrderBy(s => s.SortOrder))
            .Include(p => p.Notes.OrderBy(n => n.SortOrder))
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null)
        {
            var user = await _context.Users.FindAsync(userId)
                ?? throw new UserNotFoundException("Không tìm thấy người dùng.");

            profile = new LecturerProfile
            {
                UserId = userId,
                FullName = user.FullName
            };
            _context.LecturerProfiles.Add(profile);
            await _context.SaveChangesAsync();
        }

        return MapToResponse(profile);
    }

    public async Task<ProfileResponse> UpdateProfileAsync(int userId, UpdateProfileRequest request)
    {
        var profile = await _context.LecturerProfiles
            .Include(p => p.TeachingLocations)
            .Include(p => p.Expertises)
            .Include(p => p.Experiences)
            .Include(p => p.TeachingSkills)
            .Include(p => p.Notes)
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (profile == null)
        {
            var user = await _context.Users.FindAsync(userId)
                ?? throw new UserNotFoundException("Không tìm thấy người dùng.");

            profile = new LecturerProfile
            {
                UserId = userId,
                FullName = user.FullName
            };
            _context.LecturerProfiles.Add(profile);
            await _context.SaveChangesAsync();
        }

        // Update scalar fields
        if (request.FullName != null)
            profile.FullName = request.FullName;
        if (request.Introduction != null)
            profile.Introduction = request.Introduction;

        // Replace multi-entry collections
        if (request.TeachingLocations != null)
        {
            _context.ProfileTeachingLocations.RemoveRange(profile.TeachingLocations);
            profile.TeachingLocations = request.TeachingLocations.Select((t, i) => new ProfileTeachingLocation
            {
                ProfileId = profile.Id,
                Value = t.Value,
                SortOrder = i
            }).ToList();
        }

        if (request.Expertises != null)
        {
            _context.ProfileExpertises.RemoveRange(profile.Expertises);
            profile.Expertises = request.Expertises.Select((e, i) => new ProfileExpertise
            {
                ProfileId = profile.Id,
                Specialty = e.Specialty,
                Degree = e.Degree,
                CertificateImageUrl = e.CertificateImageUrl,
                SortOrder = i
            }).ToList();
        }

        if (request.Experiences != null)
        {
            _context.ProfileExperiences.RemoveRange(profile.Experiences);
            profile.Experiences = request.Experiences.Select((e, i) => new ProfileExperience
            {
                ProfileId = profile.Id,
                Description = e.Description,
                ImageUrl = e.ImageUrl,
                SortOrder = i
            }).ToList();
        }

        if (request.TeachingSkills != null)
        {
            _context.ProfileTeachingSkills.RemoveRange(profile.TeachingSkills);
            profile.TeachingSkills = request.TeachingSkills.Select((s, i) => new ProfileTeachingSkill
            {
                ProfileId = profile.Id,
                Description = s.Description,
                ImageUrl = s.ImageUrl,
                SortOrder = i
            }).ToList();
        }

        if (request.Notes != null)
        {
            _context.ProfileNotes.RemoveRange(profile.Notes);
            profile.Notes = request.Notes.Select((n, i) => new ProfileNote
            {
                ProfileId = profile.Id,
                Content = n.Content,
                SortOrder = i
            }).ToList();
        }

        await _context.SaveChangesAsync();

        // Re-fetch with ordering
        var updated = await _context.LecturerProfiles
            .Include(p => p.TeachingLocations.OrderBy(t => t.SortOrder))
            .Include(p => p.Expertises.OrderBy(e => e.SortOrder))
            .Include(p => p.Experiences.OrderBy(e => e.SortOrder))
            .Include(p => p.TeachingSkills.OrderBy(s => s.SortOrder))
            .Include(p => p.Notes.OrderBy(n => n.SortOrder))
            .FirstAsync(p => p.Id == profile.Id);

        return MapToResponse(updated);
    }

    public async Task UpdateAvatarAsync(int userId, string avatarUrl)
    {
        var profile = await _context.LecturerProfiles.FirstOrDefaultAsync(p => p.UserId == userId);
        if (profile == null)
        {
            var user = await _context.Users.FindAsync(userId)
                ?? throw new UserNotFoundException("Không tìm thấy người dùng.");
            profile = new LecturerProfile { UserId = userId, FullName = user.FullName, AvatarUrl = avatarUrl };
            _context.LecturerProfiles.Add(profile);
        }
        else
        {
            profile.AvatarUrl = avatarUrl;
        }
        await _context.SaveChangesAsync();
    }

    public async Task<List<PublicLecturerProfile>> SearchLecturersAsync(string? search, string? location, string? subject, string? experience, string? rating)
    {
        var query = _context.LecturerProfiles
            .Include(p => p.TeachingLocations)
            .Include(p => p.Expertises)
            .Include(p => p.Experiences)
            .Include(p => p.TeachingSkills)
            .Include(p => p.Notes)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(p => p.FullName.Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(location))
        {
            query = query.Where(p => p.TeachingLocations.Any(l => l.Value.Contains(location)));
        }

        if (!string.IsNullOrWhiteSpace(subject))
        {
            query = query.Where(p => p.Expertises.Any(e => e.Specialty.Contains(subject) || e.Degree.Contains(subject)));
        }

        // Note: experience and rating filters would need additional database fields
        // For now, we'll implement basic filtering and can extend later

        var profiles = await query.ToListAsync();

        return profiles.Select(p => new PublicLecturerProfile
        {
            Id = p.Id,
            FullName = p.FullName,
            Introduction = p.Introduction,
            AvatarUrl = p.AvatarUrl,
            TeachingLocations = p.TeachingLocations.OrderBy(t => t.SortOrder).Select(t => new PublicTeachingLocation { Value = t.Value }).ToList(),
            Expertises = p.Expertises.OrderBy(e => e.SortOrder).Select(e => new PublicExpertise
            {
                Specialty = e.Specialty,
                Degree = e.Degree,
                CertificateImageUrl = e.CertificateImageUrl
            }).ToList(),
            Experiences = p.Experiences.OrderBy(e => e.SortOrder).Select(e => new PublicExperience
            {
                Description = e.Description,
                ImageUrl = e.ImageUrl
            }).ToList(),
            TeachingSkills = p.TeachingSkills.OrderBy(s => s.SortOrder).Select(s => new PublicTeachingSkill
            {
                Description = s.Description,
                ImageUrl = s.ImageUrl
            }).ToList(),
            Notes = p.Notes.OrderBy(n => n.SortOrder).Select(n => new PublicNote
            {
                Content = n.Content
            }).ToList()
        }).ToList();
    }

    private ProfileResponse MapToResponse(LecturerProfile profile)
    {
        return new ProfileResponse
        {
            Id = profile.Id,
            UserId = profile.UserId,
            FullName = profile.FullName,
            Introduction = profile.Introduction,
            AvatarUrl = profile.AvatarUrl,
            TeachingLocations = profile.TeachingLocations.Select(t => new TeachingLocationDto { Value = t.Value }).ToList(),
            Expertises = profile.Expertises.Select(e => new ExpertiseDto
            {
                Specialty = e.Specialty,
                Degree = e.Degree,
                CertificateImageUrl = e.CertificateImageUrl
            }).ToList(),
            Experiences = profile.Experiences.Select(e => new ExperienceDto
            {
                Description = e.Description,
                ImageUrl = e.ImageUrl
            }).ToList(),
            TeachingSkills = profile.TeachingSkills.Select(s => new TeachingSkillDto
            {
                Description = s.Description,
                ImageUrl = s.ImageUrl
            }).ToList(),
            Notes = profile.Notes.Select(n => new NoteDto
            {
                Content = n.Content
            }).ToList()
        };
    }
}

public class UserNotFoundException : Exception
{
    public UserNotFoundException(string message) : base(message) { }
}
