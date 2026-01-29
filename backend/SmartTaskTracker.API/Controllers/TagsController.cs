using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartTaskTracker.API.Services;

namespace SmartTaskTracker.API.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class TagsController : ControllerBase
{
    private readonly TagService _tagService;

    public TagsController(TagService tagService)
    {
        _tagService = tagService;
    }

    private int GetUserId() => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<Dictionary<string, string>>> GetTags()
    {
        var tags = await _tagService.GetAllTagsAsync(GetUserId());
        return Ok(tags);
    }
}
