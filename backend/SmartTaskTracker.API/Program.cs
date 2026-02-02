using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SmartTaskTracker.API.Data;
using SmartTaskTracker.API.Middleware;
using SmartTaskTracker.API.Services;

var builder = WebApplication.CreateBuilder(args);

// Services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Database - Support both SQLite (dev) and PostgreSQL (production)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");

if (!string.IsNullOrEmpty(databaseUrl))
{
    // Production: PostgreSQL from Render
    // DATABASE_URL format: postgresql://user:password@host:port/database
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(databaseUrl));
}
else if (!string.IsNullOrEmpty(connectionString))
{
    // Development: SQLite
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlite(connectionString));
}
else
{
    throw new InvalidOperationException("Database connection string must be set");
}

// JWT
var jwtKey = builder.Configuration["Jwt:Key"] 
    ?? Environment.GetEnvironmentVariable("JWT_KEY")
    ?? throw new InvalidOperationException("JWT Key must be set in appsettings.json or JWT_KEY environment variable");
var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "SmartTaskTracker";
var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "SmartTaskTracker";

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<TaskService>();
builder.Services.AddScoped<TaskTemplateService>();
builder.Services.AddScoped<SettingsService>();
builder.Services.AddScoped<TagService>();

var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL")?.Trim();
var origins = string.IsNullOrEmpty(frontendUrl)
    ? new[] { "http://localhost:5173", "http://localhost:3000" }
    : new[] { frontendUrl, "http://localhost:5173", "http://localhost:3000" };
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins(origins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Middleware
app.UseMiddleware<ErrorHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowReactApp");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Ensure database is created and seeded
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    // Prefer migrations when available; fall back to EnsureCreated for seed-only dev mode.
    if (db.Database.GetMigrations().Any())
    {
        db.Database.Migrate();
    }
    else
    {
        db.Database.EnsureCreated();
    }
    if (app.Environment.IsDevelopment() || string.Equals(Environment.GetEnvironmentVariable("SEED_DATABASE"), "true", StringComparison.OrdinalIgnoreCase))
    {
        DbSeeder.SeedData(db);
    }
}

app.Run();

