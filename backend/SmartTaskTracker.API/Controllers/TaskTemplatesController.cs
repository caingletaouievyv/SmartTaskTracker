using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartTaskTracker.API.DTOs;
using SmartTaskTracker.API.Services;

namespace SmartTaskTracker.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class TaskTemplatesController : ControllerBase
{
    private readonly TaskTemplateService _templateService;

    public TaskTemplatesController(TaskTemplateService templateService)
    {
        _templateService = templateService;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<List<TaskTemplateDto>>> GetTemplates()
    {
        var templates = await _templateService.GetTemplatesAsync(GetUserId());
        return Ok(templates);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TaskTemplateDto>> GetTemplate(int id)
    {
        var template = await _templateService.GetTemplateByIdAsync(id, GetUserId());
        if (template == null) return NotFound();
        return Ok(template);
    }

    [HttpPost]
    public async Task<ActionResult<TaskTemplateDto>> CreateTemplate([FromBody] CreateTaskTemplateDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            var template = await _templateService.CreateTemplateAsync(dto, GetUserId());
            return CreatedAtAction(nameof(GetTemplate), new { id = template.Id }, template);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Failed to create template", error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTemplate(int id, [FromBody] UpdateTaskTemplateDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var success = await _templateService.UpdateTemplateAsync(id, dto, GetUserId());
        if (!success) return NotFound(new { message = "Template not found" });
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTemplate(int id)
    {
        var success = await _templateService.DeleteTemplateAsync(id, GetUserId());
        if (!success) return NotFound();
        return NoContent();
    }
}
