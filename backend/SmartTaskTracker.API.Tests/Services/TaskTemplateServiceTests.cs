using Microsoft.EntityFrameworkCore;
using SmartTaskTracker.API.Data;
using SmartTaskTracker.API.DTOs;
using SmartTaskTracker.API.Models;
using SmartTaskTracker.API.Services;
using Xunit;

namespace SmartTaskTracker.API.Tests.Services;

public class TaskTemplateServiceTests
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
            Username = "tpluser",
            Email = "tpl@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123")
        };
        context.Users.Add(user);
        context.SaveChanges();
        return user;
    }

    [Fact]
    public async System.Threading.Tasks.Task CreateAndGetTemplatesAsync_Works()
    {
        using var context = GetContext();
        var user = CreateTestUser(context);
        var service = new TaskTemplateService(context);

        var created = await service.CreateTemplateAsync(
            new CreateTaskTemplateDto { Name = "Weekly", Title = "Standup prep" },
            user.Id);

        Assert.True(created.Id > 0);
        Assert.Equal("Weekly", created.Name);

        var list = await service.GetTemplatesAsync(user.Id);
        Assert.Single(list);
        Assert.Equal("Standup prep", list[0].Title);

        var one = await service.GetTemplateByIdAsync(created.Id, user.Id);
        Assert.NotNull(one);
        Assert.Equal(created.Id, one!.Id);
    }

    [Fact]
    public async System.Threading.Tasks.Task UpdateAndDeleteTemplateAsync_Works()
    {
        using var context = GetContext();
        var user = CreateTestUser(context);
        var service = new TaskTemplateService(context);
        var created = await service.CreateTemplateAsync(
            new CreateTaskTemplateDto { Name = "T1", Title = "Original" },
            user.Id);

        var ok = await service.UpdateTemplateAsync(
            created.Id,
            new UpdateTaskTemplateDto { Name = "T1", Title = "Updated", Description = "D", Priority = Priority.High, RecurrenceType = RecurrenceType.None },
            user.Id);
        Assert.True(ok);

        var loaded = await service.GetTemplateByIdAsync(created.Id, user.Id);
        Assert.Equal("Updated", loaded!.Title);

        var deleted = await service.DeleteTemplateAsync(created.Id, user.Id);
        Assert.True(deleted);
        Assert.Null(await service.GetTemplateByIdAsync(created.Id, user.Id));
    }
}
