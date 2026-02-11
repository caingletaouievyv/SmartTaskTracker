using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SmartTaskTracker.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class HealthController : ControllerBase
{
    /// <summary>Lightweight check that the server is awake (e.g. after Render free-tier cold start).</summary>
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "ok" });
}
