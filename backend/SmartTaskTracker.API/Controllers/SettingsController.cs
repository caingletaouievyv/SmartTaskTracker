using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartTaskTracker.API.DTOs;
using SmartTaskTracker.API.Services;

namespace SmartTaskTracker.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SettingsController : ControllerBase
{
    private readonly SettingsService _settingsService;

    public SettingsController(SettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    [HttpGet]
    public async Task<IActionResult> GetSettings()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var settings = await _settingsService.GetSettingsAsync(userId);
        return Ok(settings);
    }

    [HttpPut]
    public async Task<IActionResult> UpdateSettings([FromBody] SettingsDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var settings = await _settingsService.UpdateSettingsAsync(userId, dto);
        return Ok(settings);
    }
}
