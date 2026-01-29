using Microsoft.EntityFrameworkCore;
using SmartTaskTracker.API.Data;
using SmartTaskTracker.API.DTOs;
using SmartTaskTracker.API.Models;
using SmartTaskTracker.API.Services;
using TaskAsync = System.Threading.Tasks.Task;
using TaskStatus = SmartTaskTracker.API.Models.TaskStatus;
using Xunit;

namespace SmartTaskTracker.API.Tests.Services;

public class TaskServiceTests
{
    private AppDbContext GetContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private User CreateTestUser(AppDbContext context)
    {
        var user = new User
        {
            Username = "testuser",
            Email = "test@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123")
        };
        context.Users.Add(user);
        context.SaveChanges();
        return user;
    }

    [Fact]
    public async TaskAsync CreateTaskAsync_ValidTask_ReturnsTaskDto()
    {
        using var context = GetContext();
        var user = CreateTestUser(context);
        var service = new TaskService(context);
        var dto = new CreateTaskDto
        {
            Title = "Test Task",
            Description = "Test description",
            Priority = Priority.Medium
        };

        var result = await service.CreateTaskAsync(dto, user.Id);

        Assert.NotNull(result);
        Assert.Equal("Test Task", result.Title);
        Assert.True(result.Id > 0);
    }

    [Fact]
    public async TaskAsync GetTasksAsync_ReturnsUserTasks()
    {
        using var context = GetContext();
        var user = CreateTestUser(context);
        var service = new TaskService(context);
        
        await service.CreateTaskAsync(new CreateTaskDto { Title = "Task 1" }, user.Id);
        await service.CreateTaskAsync(new CreateTaskDto { Title = "Task 2" }, user.Id);

        var result = await service.GetTasksAsync(user.Id, null, null, null);

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async TaskAsync GetTasksAsync_FiltersByStatus()
    {
        using var context = GetContext();
        var user = CreateTestUser(context);
        var service = new TaskService(context);
        
        await service.CreateTaskAsync(new CreateTaskDto { Title = "Active Task", Status = TaskStatus.Active }, user.Id);
        await service.CreateTaskAsync(new CreateTaskDto { Title = "Completed Task", Status = TaskStatus.Completed }, user.Id);

        var result = await service.GetTasksAsync(user.Id, null, "active", null);

        Assert.Single(result);
        Assert.Equal("Active Task", result[0].Title);
    }

    [Fact]
    public async TaskAsync UpdateTaskAsync_ValidTask_ReturnsSuccess()
    {
        using var context = GetContext();
        var user = CreateTestUser(context);
        var service = new TaskService(context);
        var created = await service.CreateTaskAsync(new CreateTaskDto { Title = "Original" }, user.Id);
        
        var updateDto = new UpdateTaskDto { Title = "Updated", Description = "Updated desc" };
        var result = await service.UpdateTaskAsync(created.Id, updateDto, user.Id);

        Assert.Equal(TaskService.UpdateTaskResult.Success, result);
        var updated = await service.GetTaskByIdAsync(created.Id, user.Id);
        Assert.NotNull(updated);
        Assert.Equal("Updated", updated.Title);
    }

    [Fact]
    public async TaskAsync DeleteTaskAsync_ValidId_ReturnsTrue()
    {
        using var context = GetContext();
        var user = CreateTestUser(context);
        var service = new TaskService(context);
        var created = await service.CreateTaskAsync(new CreateTaskDto { Title = "To Delete" }, user.Id);

        var result = await service.DeleteTaskAsync(created.Id, user.Id);

        Assert.True(result);
        var deleted = await service.GetTaskByIdAsync(created.Id, user.Id);
        Assert.Null(deleted);
    }

    [Fact]
    public async TaskAsync ArchiveTaskAsync_ArchivesTask()
    {
        using var context = GetContext();
        var user = CreateTestUser(context);
        var service = new TaskService(context);
        var created = await service.CreateTaskAsync(new CreateTaskDto { Title = "To Archive", Status = TaskStatus.Completed }, user.Id);

        var result = await service.ArchiveTaskAsync(created.Id, user.Id);

        Assert.True(result);
        var tasks = await service.GetTasksAsync(user.Id, null, null, null, false);
        Assert.DoesNotContain(tasks, t => t.Id == created.Id);
    }
}
