using System.Threading;
using Microsoft.EntityFrameworkCore;
using SmartTaskTracker.API.Data;
using SmartTaskTracker.API.Models;

namespace SmartTaskTracker.API.Services;

public class TagService
{
    private readonly AppDbContext _context;

    public TagService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<Dictionary<string, string>> GetAllTagsAsync(int userId, CancellationToken cancellationToken = default)
    {
        var tags = await _context.Tags
            .Where(t => t.UserId == userId)
            .OrderBy(t => t.Name)
            .ToListAsync(cancellationToken);

        return tags.ToDictionary(t => t.Name, t => t.Color);
    }
}
