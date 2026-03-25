using System.Linq;
using Microsoft.EntityFrameworkCore;
using SmartTaskTracker.API.Data;
using SmartTaskTracker.API.Models;
using SmartTaskTracker.API.Services;
using Xunit;

namespace SmartTaskTracker.API.Tests.Services;

public class TagServiceTests
{
    private AppDbContext GetContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private static User CreateTestUser(AppDbContext context)
    {
        var user = new User
        {
            Username = "taguser",
            Email = "tag@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123")
        };
        context.Users.Add(user);
        context.SaveChanges();
        return user;
    }

    [Fact]
    public async System.Threading.Tasks.Task GetAllTagsAsync_ReturnsOrderedDictionary()
    {
        using var context = GetContext();
        var user = CreateTestUser(context);
        context.Tags.AddRange(
            new Tag { Name = "Zebra", Color = "#111", UserId = user.Id },
            new Tag { Name = "Alpha", Color = "#222", UserId = user.Id }
        );
        await context.SaveChangesAsync();

        var service = new TagService(context);
        var result = await service.GetAllTagsAsync(user.Id);

        Assert.Equal(2, result.Count);
        Assert.Equal(new[] { "Alpha", "Zebra" }, result.Keys.OrderBy(k => k));
        Assert.Equal("#222", result["Alpha"]);
    }

    [Fact]
    public async System.Threading.Tasks.Task GetAllTagsAsync_IgnoresOtherUsersTags()
    {
        using var context = GetContext();
        var u1 = CreateTestUser(context);
        var u2 = new User
        {
            Username = "other",
            Email = "o@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("x")
        };
        context.Users.Add(u2);
        context.Tags.Add(new Tag { Name = "Mine", Color = "#aaa", UserId = u1.Id });
        context.Tags.Add(new Tag { Name = "Theirs", Color = "#bbb", UserId = u2.Id });
        await context.SaveChangesAsync();

        var service = new TagService(context);
        var result = await service.GetAllTagsAsync(u1.Id);

        Assert.Single(result);
        Assert.True(result.ContainsKey("Mine"));
    }
}
