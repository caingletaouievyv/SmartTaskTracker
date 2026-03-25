using System.Net;
using System.Text.Json;
using Microsoft.IdentityModel.Tokens;
using SmartTaskTracker.API.DTOs;

namespace SmartTaskTracker.API.Middleware;

public class ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorHandlingMiddleware> _logger;
    private readonly IWebHostEnvironment _environment;

    public ErrorHandlingMiddleware(
        RequestDelegate next,
        ILogger<ErrorHandlingMiddleware> logger,
        IWebHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred");
            await HandleExceptionAsync(context, ex);
        }
    }

    private Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var statusCode = HttpStatusCode.InternalServerError;
        var message = "An error occurred while processing your request.";

        if (exception is UnauthorizedAccessException ||
            exception is SecurityTokenExpiredException ||
            exception is SecurityTokenException)
        {
            statusCode = HttpStatusCode.Unauthorized;
            message = "Unauthorized or token expired.";
        }

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        // Never expose exception details to clients outside Development (ia.md / security best practice).
        var details = _environment.IsDevelopment() ? exception.Message : null;

        var errorResponse = new ErrorDto
        {
            Message = message,
            Details = details,
            StatusCode = (int)statusCode
        };

        var json = JsonSerializer.Serialize(errorResponse, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        return context.Response.WriteAsync(json);
    }
}
