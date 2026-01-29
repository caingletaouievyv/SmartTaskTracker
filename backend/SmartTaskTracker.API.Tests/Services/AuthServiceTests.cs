using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SmartTaskTracker.API.Data;
using SmartTaskTracker.API.DTOs;
using SmartTaskTracker.API.Services;
using Xunit;

namespace SmartTaskTracker.API.Tests.Services;

public class AuthServiceTests
{
    private AppDbContext GetContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }

    private IConfiguration GetConfiguration()
    {
        var jwtKey = Environment.GetEnvironmentVariable("JWT_KEY") 
            ?? "TestJwtKeyForUnitTestingOnlyMinimum32Characters!";
        var config = new Dictionary<string, string?>
        {
            { "Jwt:Key", jwtKey },
            { "Jwt:Issuer", "SmartTaskTracker" },
            { "Jwt:Audience", "SmartTaskTracker" }
        };
        return new ConfigurationBuilder().AddInMemoryCollection(config).Build();
    }

    [Fact]
    public async Task RegisterAsync_ValidUser_ReturnsAuthResponse()
    {
        // Arrange
        using var context = GetContext();
        var config = GetConfiguration();
        var service = new AuthService(context, config);
        var dto = new RegisterDto
        {
            Username = "testuser",
            Email = "test@example.com",
            Password = "password123"
        };

        // Act
        var result = await service.RegisterAsync(dto);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result.Token);
        Assert.NotEmpty(result.RefreshToken);
        Assert.Equal("testuser", result.Username);
        Assert.True(result.UserId > 0);
    }

    [Fact]
    public async Task RegisterAsync_DuplicateUsername_ReturnsNull()
    {
        // Arrange
        using var context = GetContext();
        var config = GetConfiguration();
        var service = new AuthService(context, config);
        var dto = new RegisterDto
        {
            Username = "testuser",
            Email = "test@example.com",
            Password = "password123"
        };

        await service.RegisterAsync(dto);

        // Act
        var result = await service.RegisterAsync(dto);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsAuthResponse()
    {
        // Arrange
        using var context = GetContext();
        var config = GetConfiguration();
        var service = new AuthService(context, config);
        var registerDto = new RegisterDto
        {
            Username = "testuser",
            Email = "test@example.com",
            Password = "password123"
        };
        await service.RegisterAsync(registerDto);

        var loginDto = new LoginDto
        {
            Username = "testuser",
            Password = "password123"
        };

        // Act
        var result = await service.LoginAsync(loginDto);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result.Token);
        Assert.NotEmpty(result.RefreshToken);
        Assert.Equal("testuser", result.Username);
    }

    [Fact]
    public async Task LoginAsync_InvalidCredentials_ReturnsNull()
    {
        // Arrange
        using var context = GetContext();
        var config = GetConfiguration();
        var service = new AuthService(context, config);
        var loginDto = new LoginDto
        {
            Username = "testuser",
            Password = "wrongpassword"
        };

        // Act
        var result = await service.LoginAsync(loginDto);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task RefreshTokenAsync_ValidToken_ReturnsNewTokens()
    {
        // Arrange
        using var context = GetContext();
        var config = GetConfiguration();
        var service = new AuthService(context, config);
        var registerDto = new RegisterDto
        {
            Username = "testuser",
            Email = "test@example.com",
            Password = "password123"
        };
        var authResponse = await service.RegisterAsync(registerDto);
        Assert.NotNull(authResponse);

        // Act
        var result = await service.RefreshTokenAsync(authResponse.RefreshToken);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result.Token);
        Assert.NotEmpty(result.RefreshToken);
        Assert.NotEqual(authResponse.RefreshToken, result.RefreshToken);
    }

    [Fact]
    public async Task RefreshTokenAsync_InvalidToken_ReturnsNull()
    {
        // Arrange
        using var context = GetContext();
        var config = GetConfiguration();
        var service = new AuthService(context, config);

        // Act
        var result = await service.RefreshTokenAsync("invalid-token");

        // Assert
        Assert.Null(result);
    }
}
