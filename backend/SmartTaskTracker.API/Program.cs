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
    // Render DATABASE_URL is a URI (postgresql://...); Npgsql needs keyword=value (see PostgresConnectionString).
    var npgsqlConnection = PostgresConnectionString.FromDatabaseUrl(databaseUrl);
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(npgsqlConnection));
}
else if (!string.IsNullOrEmpty(connectionString))
{
    // SQLite (local dev). In Production, a file inside Docker is ephemeral — accounts disappear on restart.
    if (builder.Environment.IsProduction())
    {
        throw new InvalidOperationException(
            "Production requires DATABASE_URL (PostgreSQL). Link a managed database to the web service on Render (or set DATABASE_URL). SQLite DefaultConnection is not supported in Production.");
    }

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
builder.Services.AddScoped<NaturalLanguageTaskService>();

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

// Ensure database is created and seeded (ia.md: explicit, configurable)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var startupLogger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Startup");

    if (db.Database.GetMigrations().Any())
    {
        db.Database.Migrate();
    }
    else
    {
        db.Database.EnsureCreated();
    }

    if (!app.Environment.IsProduction()
        && db.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) == true)
    {
        startupLogger.LogInformation("Using SQLite; data persists while the database file remains on disk.");
    }

    // SEED_DATABASE=false → never seed. SEED_DATABASE=true → always seed. Unset: Development defaults on; Production/Staging only if SeedDatabase: true in config.
    var seedEnv = Environment.GetEnvironmentVariable("SEED_DATABASE");
    var seedExplicitlyOff = string.Equals(seedEnv, "false", StringComparison.OrdinalIgnoreCase);
    var seedExplicitlyOn = string.Equals(seedEnv, "true", StringComparison.OrdinalIgnoreCase);
    var seedFromConfig = app.Configuration.GetValue<bool?>("SeedDatabase");
    var runSeed = !seedExplicitlyOff && (
        seedExplicitlyOn
        || (app.Environment.IsDevelopment() && (seedFromConfig ?? true))
        || (!app.Environment.IsDevelopment() && seedFromConfig == true));

    if (runSeed)
    {
        DbSeeder.ClearSeedData(db);
        DbSeeder.SeedData(db);
    }
}

app.Run();

