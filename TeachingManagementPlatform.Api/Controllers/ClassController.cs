using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Route("api/classes")]
[Authorize(Roles = "Lecturer")]
public class ClassController : ControllerBase
{
    private readonly IClassService _classService;

    public ClassController(IClassService classService)
    {
        _classService = classService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = GetUserId();
        var classes = await _classService.GetAllAsync(userId);
        return Ok(classes);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var userId = GetUserId();
        try
        {
            var cls = await _classService.GetByIdAsync(id, userId);
            return Ok(cls);
        }
        catch (ClassNotFoundException ex)
        {
            return NotFound(new { error = new { code = "CLASS_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateClassRequest request)
    {
        var userId = GetUserId();
        var cls = await _classService.CreateAsync(userId, request);
        return CreatedAtAction(nameof(GetById), new { id = cls.Id }, cls);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateClassRequest request)
    {
        var userId = GetUserId();
        try
        {
            var cls = await _classService.UpdateAsync(id, userId, request);
            return Ok(cls);
        }
        catch (ClassNotFoundException ex)
        {
            return NotFound(new { error = new { code = "CLASS_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = GetUserId();
        try
        {
            await _classService.DeleteAsync(id, userId);
            return NoContent();
        }
        catch (ClassNotFoundException ex)
        {
            return NotFound(new { error = new { code = "CLASS_NOT_FOUND", message = ex.Message } });
        }
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException("User ID not found in token.");
        return int.Parse(userIdClaim);
    }
}
