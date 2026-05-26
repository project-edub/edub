using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Configuration.Json;
using Microsoft.IdentityModel.Tokens;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

var builder = WebApplication.CreateBuilder(args);

string? GetGoogleConfigurationValue(string key, string? developmentDefault = null)
{
    return builder.Configuration[$"Google:{key}"]
        ?? builder.Configuration[$"Authentication:Google:{key}"]
        ?? (builder.Environment.IsDevelopment() ? developmentDefault : null);
}

builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
{
    ["Google:ClientId"] = GetGoogleConfigurationValue("ClientId"),
    ["Google:ClientSecret"] = GetGoogleConfigurationValue("ClientSecret"),
    ["Google:RedirectUri"] = GetGoogleConfigurationValue(
        "RedirectUri",
        "http://localhost:5000/api/auth/google/callback"),
    ["Google:FrontendCallbackUrl"] = GetGoogleConfigurationValue(
        "FrontendCallbackUrl",
        "http://localhost:5173/auth/google/callback"),
});

// Add services to the container.
builder.Services.AddControllers();

// Configure CORS for React frontend
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var allowedOriginsSetting = builder.Configuration["Cors:AllowedOrigins"];
        var allowedOrigins = string.IsNullOrWhiteSpace(allowedOriginsSetting)
            ? new[] { "http://localhost:5173", "http://localhost:5174" }
            : allowedOriginsSetting
                .Split(new[] { ';', ',' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Configure JWT Bearer authentication
var jwtSettings = builder.Configuration.GetSection("Jwt");
var key = Encoding.UTF8.GetBytes(jwtSettings["SecretKey"]!);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key)
    };
});

builder.Services.AddAuthorization();

// Configure Entity Framework Core with MSSQL
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Register file storage
builder.Services.AddScoped<IFileStorage, LocalFileStorage>();

// Register auth service
builder.Services.AddScoped<IAuthService, AuthService>();

// Register account service
builder.Services.AddScoped<IAccountService, AccountService>();

// Register subscription service
builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();

// Register profile service
builder.Services.AddScoped<IProfileService, ProfileService>();

// Register class service
builder.Services.AddScoped<IClassService, ClassService>();

// Register student list service
builder.Services.AddScoped<IStudentListService, StudentListService>();

// Register Excel service
builder.Services.AddScoped<IExcelService, ExcelService>();

// Register file parsing service (docx, pdf, xlsx)
builder.Services.AddScoped<IFileParsingService, FileParsingService>();

// Register lesson plan service
builder.Services.AddScoped<ILessonPlanService, LessonPlanService>();

// Register lesson service
builder.Services.AddScoped<ILessonService, LessonService>();

// Register class lesson plan service
builder.Services.AddScoped<IClassLessonPlanService, ClassLessonPlanService>();

// Register Google token validator
builder.Services.AddScoped<IGoogleTokenValidator, GoogleTokenValidator>();

// Register mini game service
builder.Services.AddScoped<IMiniGameService, MiniGameService>();

// Register storage service
builder.Services.AddScoped<IStorageService, StorageService>();

// Register AI service
builder.Services.AddHttpClient<IAIService, AIService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(60);
});

// Register quiz mapping/validation service
builder.Services.AddScoped<IQuizMappingService, QuizMappingService>();
// Register Google Forms service
builder.Services.AddScoped<IGoogleFormsService, GoogleFormsService>();

var app = builder.Build();

// Backfill schema drift in local/dev DBs where migration history may be out of sync.
try
{
    // Attempt DB backfill; if connection string is missing or invalid, log and continue.
    using (var scope = app.Services.CreateScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await dbContext.Database.ExecuteSqlRawAsync(@"
IF COL_LENGTH('ClassLessonSchedules', 'LessonStatus') IS NULL
BEGIN
    ALTER TABLE [ClassLessonSchedules]
    ADD [LessonStatus] nvarchar(20) NOT NULL
        CONSTRAINT [DF_ClassLessonSchedules_LessonStatus] DEFAULT N'pending';
END
");
    }
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex, "DB backfill skipped at startup (connection string may be missing or invalid).");
}

// Configure the HTTP request pipeline.
var runningInContainer = string.Equals(
    Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER"),
    "true",
    StringComparison.OrdinalIgnoreCase);

if (!runningInContainer)
{
    app.UseHttpsRedirection();
}
app.UseCors();

// Serve uploaded files as static content
var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
Directory.CreateDirectory(uploadsPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads"
});

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Lightweight health endpoint for load balancers and smoke checks
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

async Task SeedSampleDataAsync(ApplicationDbContext context)
{
    if (await context.LecturerProfiles.AnyAsync())
        return; // Already seeded

    var (users, profiles) = SampleData.GetSampleUsersAndProfiles();

    await context.Users.AddRangeAsync(users);
    await context.SaveChangesAsync();

    // Update profile UserIds with the actual IDs from saved users
    for (int i = 0; i < profiles.Count; i++)
    {
        profiles[i].UserId = users[i].Id;
    }

    await context.LecturerProfiles.AddRangeAsync(profiles);
    await context.SaveChangesAsync();
}

async Task EnsureAdminAccountAsync(ApplicationDbContext context)
{
    const string adminEmail = "edub-admin@gmail.com";

    var adminExists = await context.Users.AnyAsync(u => u.Email == adminEmail);
    if (adminExists)
        return;

    context.Users.Add(new User
    {
        FullName = "edub-admin",
        Email = adminEmail,
        PasswordHash = BCrypt.Net.BCrypt.HashPassword("eb192837"),
        Role = "Admin",
        Status = "Active",
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    });

    await context.SaveChangesAsync();
}

// Seed sample data before starting the server
try
{
    using (var scope = app.Services.CreateScope())
    {
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await EnsureAdminAccountAsync(context);
        await SeedSampleDataAsync(context);
    }
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex, "Sample data seeding skipped at startup (DB may be unavailable).");
}

app.Run();

// Make Program class accessible for integration tests
public partial class Program { }
