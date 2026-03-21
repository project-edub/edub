using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface IProfileService
{
    Task<ProfileResponse> GetProfileAsync(int userId);
    Task<ProfileResponse> UpdateProfileAsync(int userId, UpdateProfileRequest request);
    Task UpdateAvatarAsync(int userId, string avatarUrl);
    Task<List<PublicLecturerProfile>> SearchLecturersAsync(string? search, string? location, string? subject, string? experience, string? rating);
}
