using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SmartTaskTracker.API.Data;
using SmartTaskTracker.API.Helpers;
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

// JWT — resolve once, inject everywhere
var jwtOptions = new JwtOptions
{
    Key = builder.Configuration["Jwt:Key"] ?? Environment.GetEnvironmentVariable("JWT_KEY")
        ?? throw new InvalidOperationException("JWT Key must be set (Jwt:Key or JWT_KEY)."),
    Issuer = builder.Configuration["Jwt:Issuer"] ?? "SmartTaskTracker",
    Audience = builder.Configuration["Jwt:Audience"] ?? "SmartTaskTracker"
};
builder.Services.AddSingleton(jwtOptions);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<TaskService>();
builder.Services.AddScoped<TaskTemplateService>();
builder.Services.AddScoped<SettingsService>();
builder.Services.AddScoped<TagService>();
builder.Services.Configure<TaskMemoryOptions>(builder.Configuration.GetSection(TaskMemoryOptions.SectionName));
builder.Services.AddHttpClient();
builder.Services.AddScoped<TaskMemoryService>();

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
    if (db.Database.GetMigrations().Any())
    {
        db.Database.Migrate();
    }
    else
    {
        db.Database.EnsureCreated();
    }
    var seedFromConfig = app.Configuration.GetValue<bool?>("SeedDatabase");
    var seedFromEnv = string.Equals(Environment.GetEnvironmentVariable("SEED_DATABASE"), "true", StringComparison.OrdinalIgnoreCase);
    var seedDb = seedFromConfig ?? (app.Environment.IsDevelopment() || seedFromEnv);
    if (seedDb)
    {
        DbSeeder.ClearSeedData(db);
        DbSeeder.SeedData(db);
    }
}

app.Run();

