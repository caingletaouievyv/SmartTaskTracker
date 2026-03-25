using Microsoft.EntityFrameworkCore;
using SmartTaskTracker.API.Data;
using SmartTaskTracker.API.DTOs;
using SmartTaskTracker.API.Models;
using SmartTaskTracker.API.Services;
using Xunit;

namespace SmartTaskTracker.API.Tests.Services;

public class SettingsServiceTests
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
            Username = "setuser",
            Email = "set@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123")
        };
        context.Users.Add(user);
        context.SaveChanges();
        return user;
    }

    [Fact]
    public async System.Threading.Tasks.Task GetSettingsAsync_CreatesRowWhenMissing()
    {
        using var context = GetContext();
        var user = CreateTestUser(context);
        var service = new SettingsService(context);

        var dto = await service.GetSettingsAsync(user.Id);

        Assert.NotNull(dto);
        Assert.Equal("dark", dto.Theme);
        Assert.Contains(user.Id, context.UserSettings.Select(s => s.UserId));
    }

    [Fact]
    public async System.Threading.Tasks.Task GetSettingsAsync_ThrowsWhenUserMissing()
    {
        using var context = GetContext();
        var service = new SettingsService(context);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => service.GetSettingsAsync(999));
    }

    [Fact]
    public async System.Threading.Tasks.Task UpdateSettingsAsync_PersistsTheme()
    {
        using var context = GetContext();
        var user = CreateTestUser(context);
        var service = new SettingsService(context);
        var current = await service.GetSettingsAsync(user.Id);
        Assert.NotNull(current);

        current!.Theme = "light";
        current.AccentColor = "blue";

        var updated = await service.UpdateSettingsAsync(user.Id, current);

        Assert.NotNull(updated);
        Assert.Equal("light", updated.Theme);
        Assert.Equal("blue", updated.AccentColor);

        var row = await context.UserSettings.FirstAsync(s => s.UserId == user.Id);
        Assert.Equal("light", row.Theme);
        Assert.Equal("blue", row.AccentColor);
    }
}
