using Microsoft.AspNetCore.Mvc;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Route("api/public")]
public class PublicController : ControllerBase
{
    private readonly IProfileService _profileService;

    public PublicController(IProfileService profileService)
    {
        _profileService = profileService;
        
    }
    
    [HttpGet("lecturers")]
    public async Task<IActionResult> SearchLecturers(
        [FromQuery] string? search = null,
        [FromQuery] string? location = null,
        [FromQuery] string? subject = null,
        [FromQuery] string? experience = null,
        [FromQuery] string? rating = null)
    {
        try
        {
            var lecturers = await _profileService.SearchLecturersAsync(search, location, subject, experience, rating);
            return Ok(lecturers ?? new List<PublicLecturerProfile>());
        }
        catch (Exception)
        {
            // Return empty array instead of 500 error for now
            return Ok(new List<PublicLecturerProfile>());
        }
    }

    [HttpGet("lecturers/count")]
    public async Task<IActionResult> GetLecturersCount()
    {
        try
        {
            var lecturers = await _profileService.SearchLecturersAsync(null, null, null, null, null);
            return Ok(new { count = lecturers.Count });
        }
        catch (Exception)
        {
            return Ok(new { count = 0 });
        }
    }

}