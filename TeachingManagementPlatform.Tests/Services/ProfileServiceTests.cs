using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Tests.Services;

public class ProfileServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly ProfileService _service;
    private readonly User _testUser;

    public ProfileServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"ProfileTest_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _service = new ProfileService(_context);

        _testUser = new User
        {
            Email = "lecturer@test.com",
            FullName = "Test Lecturer",
            Role = "Lecturer",
            Status = "Active",
            PasswordHash = "hash"
        };
        _context.Users.Add(_testUser);
        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    // --- GetProfileAsync ---

    [Fact]
    public async Task GetProfileAsync_CreatesProfile_WhenNoneExists()
    {
        var result = await _service.GetProfileAsync(_testUser.Id);

        Assert.Equal(_testUser.Id, result.UserId);
        Assert.Equal(_testUser.FullName, result.FullName);
    }

    [Fact]
    public async Task GetProfileAsync_ReturnsExistingProfile()
    {
        var profile = new LecturerProfile
        {
            UserId = _testUser.Id,
            FullName = "Custom Name",
            Introduction = "Hello"
        };
        _context.LecturerProfiles.Add(profile);
        await _context.SaveChangesAsync();

        var result = await _service.GetProfileAsync(_testUser.Id);

        Assert.Equal("Custom Name", result.FullName);
        Assert.Equal("Hello", result.Introduction);
    }

    [Fact]
    public async Task GetProfileAsync_Throws_WhenUserNotFound()
    {
        await Assert.ThrowsAsync<UserNotFoundException>(
            () => _service.GetProfileAsync(999));
    }

    [Fact]
    public async Task GetProfileAsync_ReturnsCollectionsOrderedBySortOrder()
    {
        var profile = new LecturerProfile { UserId = _testUser.Id, FullName = "Test" };
        _context.LecturerProfiles.Add(profile);
        await _context.SaveChangesAsync();

        _context.ProfileOccupations.AddRange(
            new ProfileOccupation { ProfileId = profile.Id, Value = "Second", SortOrder = 1 },
            new ProfileOccupation { ProfileId = profile.Id, Value = "First", SortOrder = 0 },
            new ProfileOccupation { ProfileId = profile.Id, Value = "Third", SortOrder = 2 }
        );
        await _context.SaveChangesAsync();

        var result = await _service.GetProfileAsync(_testUser.Id);

        Assert.Equal(3, result.Occupations.Count);
        Assert.Equal("First", result.Occupations[0].Value);
        Assert.Equal("Second", result.Occupations[1].Value);
        Assert.Equal("Third", result.Occupations[2].Value);
    }

    // --- UpdateProfileAsync ---

    [Fact]
    public async Task UpdateProfileAsync_UpdatesScalarFields()
    {
        await _service.GetProfileAsync(_testUser.Id); // ensure profile exists

        var request = new UpdateProfileRequest
        {
            FullName = "Updated Name",
            Introduction = "New intro"
        };

        var result = await _service.UpdateProfileAsync(_testUser.Id, request);

        Assert.Equal("Updated Name", result.FullName);
        Assert.Equal("New intro", result.Introduction);
    }

    [Fact]
    public async Task UpdateProfileAsync_ReplacesOccupations_PreservingOrder()
    {
        await _service.GetProfileAsync(_testUser.Id);

        var request = new UpdateProfileRequest
        {
            Occupations = new List<OccupationDto>
            {
                new() { Value = "Teacher" },
                new() { Value = "Researcher" },
                new() { Value = "Consultant" }
            }
        };

        var result = await _service.UpdateProfileAsync(_testUser.Id, request);

        Assert.Equal(3, result.Occupations.Count);
        Assert.Equal("Teacher", result.Occupations[0].Value);
        Assert.Equal("Researcher", result.Occupations[1].Value);
        Assert.Equal("Consultant", result.Occupations[2].Value);
    }

    [Fact]
    public async Task UpdateProfileAsync_ReplacesExpertises_WithImages()
    {
        await _service.GetProfileAsync(_testUser.Id);

        var request = new UpdateProfileRequest
        {
            Expertises = new List<ExpertiseDto>
            {
                new() { Specialty = "Math", Degree = "PhD", CertificateImageUrl = "/img/cert1.jpg" },
                new() { Specialty = "Physics", Degree = "MSc", CertificateImageUrl = null }
            }
        };

        var result = await _service.UpdateProfileAsync(_testUser.Id, request);

        Assert.Equal(2, result.Expertises.Count);
        Assert.Equal("Math", result.Expertises[0].Specialty);
        Assert.Equal("/img/cert1.jpg", result.Expertises[0].CertificateImageUrl);
        Assert.Equal("Physics", result.Expertises[1].Specialty);
        Assert.Null(result.Expertises[1].CertificateImageUrl);
    }

    [Fact]
    public async Task UpdateProfileAsync_ReplacesExperiences_WithImages()
    {
        await _service.GetProfileAsync(_testUser.Id);

        var request = new UpdateProfileRequest
        {
            Experiences = new List<ExperienceDto>
            {
                new() { Description = "5 years teaching", ImageUrl = "/img/exp1.jpg" },
                new() { Description = "2 years research" }
            }
        };

        var result = await _service.UpdateProfileAsync(_testUser.Id, request);

        Assert.Equal(2, result.Experiences.Count);
        Assert.Equal("5 years teaching", result.Experiences[0].Description);
        Assert.Equal("/img/exp1.jpg", result.Experiences[0].ImageUrl);
        Assert.Null(result.Experiences[1].ImageUrl);
    }

    [Fact]
    public async Task UpdateProfileAsync_ReplacesTeachingSkills_WithImages()
    {
        await _service.GetProfileAsync(_testUser.Id);

        var request = new UpdateProfileRequest
        {
            TeachingSkills = new List<TeachingSkillDto>
            {
                new() { Description = "Interactive teaching", ImageUrl = "/img/skill1.jpg" },
                new() { Description = "Online teaching" }
            }
        };

        var result = await _service.UpdateProfileAsync(_testUser.Id, request);

        Assert.Equal(2, result.TeachingSkills.Count);
        Assert.Equal("Interactive teaching", result.TeachingSkills[0].Description);
        Assert.Equal("/img/skill1.jpg", result.TeachingSkills[0].ImageUrl);
    }

    [Fact]
    public async Task UpdateProfileAsync_ReplacesTeachingLocationsAndTuitionFees()
    {
        await _service.GetProfileAsync(_testUser.Id);

        var request = new UpdateProfileRequest
        {
            TeachingLocations = new List<TeachingLocationDto>
            {
                new() { Value = "Hanoi" },
                new() { Value = "HCMC" }
            },
            TuitionFees = new List<TuitionFeeDto>
            {
                new() { Description = "200k/hour" },
                new() { Description = "500k/session" }
            }
        };

        var result = await _service.UpdateProfileAsync(_testUser.Id, request);

        Assert.Equal(2, result.TeachingLocations.Count);
        Assert.Equal("Hanoi", result.TeachingLocations[0].Value);
        Assert.Equal(2, result.TuitionFees.Count);
        Assert.Equal("200k/hour", result.TuitionFees[0].Description);
    }

    [Fact]
    public async Task UpdateProfileAsync_ReplacesNotes()
    {
        await _service.GetProfileAsync(_testUser.Id);

        var request = new UpdateProfileRequest
        {
            Notes = new List<NoteDto>
            {
                new() { Content = "Note 1" },
                new() { Content = "Note 2" }
            }
        };

        var result = await _service.UpdateProfileAsync(_testUser.Id, request);

        Assert.Equal(2, result.Notes.Count);
        Assert.Equal("Note 1", result.Notes[0].Content);
        Assert.Equal("Note 2", result.Notes[1].Content);
    }

    [Fact]
    public async Task UpdateProfileAsync_DeletesOldEntries_OnReplace()
    {
        await _service.GetProfileAsync(_testUser.Id);

        // First update: add 3 occupations
        await _service.UpdateProfileAsync(_testUser.Id, new UpdateProfileRequest
        {
            Occupations = new List<OccupationDto>
            {
                new() { Value = "A" }, new() { Value = "B" }, new() { Value = "C" }
            }
        });

        // Second update: replace with 1 occupation
        var result = await _service.UpdateProfileAsync(_testUser.Id, new UpdateProfileRequest
        {
            Occupations = new List<OccupationDto> { new() { Value = "Only" } }
        });

        Assert.Single(result.Occupations);
        Assert.Equal("Only", result.Occupations[0].Value);

        // Verify old entries are gone from DB
        var dbCount = await _context.ProfileOccupations.CountAsync();
        Assert.Equal(1, dbCount);
    }

    [Fact]
    public async Task UpdateProfileAsync_CreatesProfile_WhenNoneExists()
    {
        var request = new UpdateProfileRequest
        {
            FullName = "New Profile",
            Occupations = new List<OccupationDto> { new() { Value = "Teacher" } }
        };

        var result = await _service.UpdateProfileAsync(_testUser.Id, request);

        Assert.Equal("New Profile", result.FullName);
        Assert.Single(result.Occupations);
    }

    [Fact]
    public async Task UpdateProfileAsync_Throws_WhenUserNotFound()
    {
        await Assert.ThrowsAsync<UserNotFoundException>(
            () => _service.UpdateProfileAsync(999, new UpdateProfileRequest { FullName = "X" }));
    }
}
