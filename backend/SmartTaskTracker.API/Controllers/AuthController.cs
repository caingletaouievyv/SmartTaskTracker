using Microsoft.AspNetCore.Mvc;
using SmartTaskTracker.API.DTOs;
using SmartTaskTracker.API.Services;

namespace SmartTaskTracker.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;

    public AuthController(AuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _authService.RegisterAsync(dto);
        if (result == null)
            return BadRequest(new { message = "Username or email already exists" });

        return Ok(result);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _authService.LoginAsync(dto);
        if (result == null)
            return Unauthorized(new { message = "Invalid credentials" });

        return Ok(result);
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var result = await _authService.RefreshTokenAsync(dto.RefreshToken);
        if (result == null)
            return Unauthorized(new { message = "Invalid or expired refresh token" });

        return Ok(result);
    }
}

