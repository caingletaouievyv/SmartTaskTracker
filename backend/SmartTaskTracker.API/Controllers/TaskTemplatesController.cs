using System.Security.Claims;
using System.Threading;
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
    public async Task<ActionResult<List<TaskTemplateDto>>> GetTemplates(CancellationToken cancellationToken)
    {
        var templates = await _templateService.GetTemplatesAsync(GetUserId(), cancellationToken);
        return Ok(templates);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TaskTemplateDto>> GetTemplate(int id, CancellationToken cancellationToken)
    {
        var template = await _templateService.GetTemplateByIdAsync(id, GetUserId(), cancellationToken);
        if (template == null) return NotFound();
        return Ok(template);
    }

    [HttpPost]
    public async Task<ActionResult<TaskTemplateDto>> CreateTemplate([FromBody] CreateTaskTemplateDto dto, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var template = await _templateService.CreateTemplateAsync(dto, GetUserId(), cancellationToken);
        return CreatedAtAction(nameof(GetTemplate), new { id = template.Id }, template);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTemplate(int id, [FromBody] UpdateTaskTemplateDto dto, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var success = await _templateService.UpdateTemplateAsync(id, dto, GetUserId(), cancellationToken);
        if (!success) return NotFound(new { message = "Template not found" });
        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTemplate(int id, CancellationToken cancellationToken)
    {
        var success = await _templateService.DeleteTemplateAsync(id, GetUserId(), cancellationToken);
        if (!success) return NotFound();
        return NoContent();
    }
}
