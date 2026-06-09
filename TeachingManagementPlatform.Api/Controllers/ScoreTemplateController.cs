using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Route("api/score-templates")]
[Authorize(Roles = "Lecturer,Admin")]
public class ScoreTemplateController : ControllerBase
{
    private readonly IScoreTemplateService _scoreTemplateService;

    public ScoreTemplateController(IScoreTemplateService scoreTemplateService)
    {
        _scoreTemplateService = scoreTemplateService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var templates = await _scoreTemplateService.GetAllAsync();
        return Ok(templates);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        try
        {
            var template = await _scoreTemplateService.GetByIdAsync(id);
            return Ok(template);
        }
        catch (ScoreTemplateNotFoundException ex)
        {
            return NotFound(new { error = new { code = "TEMPLATE_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateScoreTemplateRequest request)
    {
        var template = await _scoreTemplateService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = template.Id }, template);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateScoreTemplateRequest request)
    {
        try
        {
            var template = await _scoreTemplateService.UpdateAsync(id, request);
            return Ok(template);
        }
        catch (ScoreTemplateNotFoundException ex)
        {
            return NotFound(new { error = new { code = "TEMPLATE_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _scoreTemplateService.DeleteAsync(id);
            return NoContent();
        }
        catch (ScoreTemplateNotFoundException ex)
        {
            return NotFound(new { error = new { code = "TEMPLATE_NOT_FOUND", message = ex.Message } });
        }
    }
}
