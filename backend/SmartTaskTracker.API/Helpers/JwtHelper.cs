using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using SmartTaskTracker.API.DTOs;
using SmartTaskTracker.API.Models;

namespace SmartTaskTracker.API.Helpers;

public static class JwtHelper
{
    public static string GenerateToken(User user, JwtOptions options)
    {
        var key = Encoding.UTF8.GetBytes(options.Key);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username)
        };
        var token = new JwtSecurityToken(
            options.Issuer,
            options.Audience,
            claims,
            expires: DateTime.UtcNow.AddHours(1),
            signingCredentials: new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256)
        );
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public static string GenerateRefreshToken()
    {
        var randomNumber = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        return Convert.ToBase64String(randomNumber);
    }

    public static AuthResponseDto CreateAuthResponse(User user, string token, string refreshToken) => new()
    {
        Token = token,
        RefreshToken = refreshToken,
        UserId = user.Id,
        Username = user.Username
    };
}

