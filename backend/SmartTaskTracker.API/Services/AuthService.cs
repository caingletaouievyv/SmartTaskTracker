using Microsoft.EntityFrameworkCore;
using SmartTaskTracker.API.Data;
using SmartTaskTracker.API.DTOs;
using SmartTaskTracker.API.Helpers;
using SmartTaskTracker.API.Models;

namespace SmartTaskTracker.API.Services;

public class AuthService
{
    private readonly AppDbContext _context;
    private readonly JwtOptions _jwtOptions;

    public AuthService(AppDbContext context, JwtOptions jwtOptions)
    {
        _context = context;
        _jwtOptions = jwtOptions;
    }

    public async Task<AuthResponseDto?> RegisterAsync(RegisterDto dto)
    {
        if (await _context.Users.AnyAsync(u => u.Username == dto.Username || u.Email == dto.Email))
            return null;

        var user = new User
        {
            Username = dto.Username,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password)
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var token = JwtHelper.GenerateToken(user, _jwtOptions);
        var refreshToken = JwtHelper.GenerateRefreshToken();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _context.SaveChangesAsync();

        return JwtHelper.CreateAuthResponse(user, token, refreshToken);
    }

    public async Task<AuthResponseDto?> LoginAsync(LoginDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == dto.Username);
        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return null;

        var token = JwtHelper.GenerateToken(user, _jwtOptions);
        var refreshToken = JwtHelper.GenerateRefreshToken();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _context.SaveChangesAsync();

        return JwtHelper.CreateAuthResponse(user, token, refreshToken);
    }

    public async Task<AuthResponseDto?> RefreshTokenAsync(string refreshToken)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => 
            u.RefreshToken == refreshToken && 
            u.RefreshTokenExpiry > DateTime.UtcNow);

        if (user == null)
            return null;

        var token = JwtHelper.GenerateToken(user, _jwtOptions);
        var newRefreshToken = JwtHelper.GenerateRefreshToken();
        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpiry = DateTime.UtcNow.AddDays(7);
        await _context.SaveChangesAsync();

        return JwtHelper.CreateAuthResponse(user, token, newRefreshToken);
    }
}

