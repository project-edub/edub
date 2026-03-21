using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();

// Configure CORS for React frontend
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://localhost:5174")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Configure JWT Bearer authentication
var jwtSettings = builder.Configuration.GetSection("Jwt");
var key = Encoding.UTF8.GetBytes(jwtSettings["Key"]!);

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

var app = builder.Build();

// Backfill schema drift in local/dev DBs where migration history may be out of sync.
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

// Configure the HTTP request pipeline.
app.UseHttpsRedirection();
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

// Seed sample data before starting the server
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await SeedSampleDataAsync(context);
}

app.Run();

// Make Program class accessible for integration tests
public partial class Program { }
