using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Configuration.Json;
using Microsoft.IdentityModel.Tokens;
using PayOS;
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

string? GetPayOsConfigurationValue(string key)
{
    return builder.Configuration[$"PayOS:{key}"]
        ?? builder.Configuration[$"Payment:PayOS:{key}"];
}

builder.Configuration.AddJsonFile("shared-secrets.json", optional: true, reloadOnChange: true);

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
builder.Services.AddScoped<IFileStorage>(serviceProvider =>
{
    var configuration = serviceProvider.GetRequiredService<IConfiguration>();
    var accountId = configuration["R2:AccountId"];
    var accessKeyId = configuration["R2:AccessKeyId"];
    var secretAccessKey = configuration["R2:SecretAccessKey"];
    var bucketName = configuration["R2:BucketName"];
    var publicBaseUrl = configuration["R2:PublicBaseUrl"];

    if (!string.IsNullOrWhiteSpace(accountId)
        && !string.IsNullOrWhiteSpace(accessKeyId)
        && !string.IsNullOrWhiteSpace(secretAccessKey)
        && !string.IsNullOrWhiteSpace(bucketName)
        && !string.IsNullOrWhiteSpace(publicBaseUrl))
    {
        return new CloudflareR2FileStorage(configuration);
    }

    return new LocalFileStorage(configuration);
});

// Register auth service
builder.Services.AddScoped<IAuthService, AuthService>();

// Register account service
builder.Services.AddScoped<IAccountService, AccountService>();

// Register subscription service
builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();

// Register coin services
builder.Services.AddScoped<ICoinService, CoinService>();
builder.Services.AddScoped<ICoinPackageService, CoinPackageService>();

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

// Register PayOS client and payment service
builder.Services.AddSingleton(_ => new PayOSClient(new PayOSOptions
{
    ClientId = GetPayOsConfigurationValue("ClientId") ?? throw new InvalidOperationException("PayOS:ClientId is not configured"),
    ApiKey = GetPayOsConfigurationValue("ApiKey") ?? throw new InvalidOperationException("PayOS:ApiKey is not configured"),
    ChecksumKey = GetPayOsConfigurationValue("ChecksumKey") ?? throw new InvalidOperationException("PayOS:ChecksumKey is not configured")
}));
builder.Services.AddScoped<IPaymentService, PaymentService>();

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
var r2PublicBaseUrl = builder.Configuration["R2:PublicBaseUrl"];
var useR2Storage = !string.IsNullOrWhiteSpace(builder.Configuration["R2:AccountId"])
    && !string.IsNullOrWhiteSpace(builder.Configuration["R2:AccessKeyId"])
    && !string.IsNullOrWhiteSpace(builder.Configuration["R2:SecretAccessKey"])
    && !string.IsNullOrWhiteSpace(builder.Configuration["R2:BucketName"])
    && !string.IsNullOrWhiteSpace(r2PublicBaseUrl);

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

IF COL_LENGTH('SubscriptionPackages', 'IsDefault') IS NULL
BEGIN
    ALTER TABLE [SubscriptionPackages]
    ADD [IsDefault] bit NOT NULL
        CONSTRAINT [DF_SubscriptionPackages_IsDefault] DEFAULT CAST(0 AS bit);
END

IF COL_LENGTH('SubscriptionPackages', 'MaxFilesPerQuizGeneration') IS NULL
BEGIN
    ALTER TABLE [SubscriptionPackages]
    ADD [MaxFilesPerQuizGeneration] int NOT NULL
        CONSTRAINT [DF_SubscriptionPackages_MaxFilesPerQuizGeneration] DEFAULT 1;
END

IF COL_LENGTH('SubscriptionPackages', 'MaxQuestionsPerQuiz') IS NULL
BEGIN
    ALTER TABLE [SubscriptionPackages]
    ADD [MaxQuestionsPerQuiz] int NOT NULL
        CONSTRAINT [DF_SubscriptionPackages_MaxQuestionsPerQuiz] DEFAULT 10;
END

IF COL_LENGTH('Users', 'CoinBalance') IS NULL
BEGIN
    ALTER TABLE [Users]
    ADD [CoinBalance] int NOT NULL
        CONSTRAINT [DF_Users_CoinBalance] DEFAULT 0;
END

IF COL_LENGTH('Users', 'SubscriptionPackageId') IS NULL
BEGIN
    ALTER TABLE [Users]
    ADD [SubscriptionPackageId] int NULL;
END

IF OBJECT_ID('CoinPackages', 'U') IS NULL
BEGIN
    CREATE TABLE [CoinPackages] (
        [Id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_CoinPackages] PRIMARY KEY,
        [Name] nvarchar(200) NOT NULL,
        [Price] decimal(18,2) NOT NULL,
        [CoinAmount] int NOT NULL,
        [Description] nvarchar(max) NULL,
        [IsActive] bit NOT NULL CONSTRAINT [DF_CoinPackages_IsActive] DEFAULT CAST(1 AS bit),
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL
    );
END

IF OBJECT_ID('CoinPurchaseTransactions', 'U') IS NULL
BEGIN
    CREATE TABLE [CoinPurchaseTransactions] (
        [Id] int IDENTITY(1,1) NOT NULL CONSTRAINT [PK_CoinPurchaseTransactions] PRIMARY KEY,
        [OrderCode] bigint NOT NULL,
        [UserId] int NOT NULL,
        [CoinPackageId] int NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [CoinAmount] int NOT NULL,
        [Status] nvarchar(30) NOT NULL,
        [CheckoutUrl] nvarchar(max) NULL,
        [PaymentLinkId] nvarchar(200) NULL,
        [ErrorMessage] nvarchar(max) NULL,
        [PaidAt] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [UQ_CoinPurchaseTransactions_OrderCode] UNIQUE ([OrderCode]),
        CONSTRAINT [FK_CoinPurchaseTransactions_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users]([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_CoinPurchaseTransactions_CoinPackages_CoinPackageId] FOREIGN KEY ([CoinPackageId]) REFERENCES [CoinPackages]([Id])
    );
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
    if (!app.Environment.IsDevelopment())
    {
        app.UseHttpsRedirection();
    }
}
app.UseCors();

// Serve uploaded files as static content
var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
Directory.CreateDirectory(uploadsPath);
if (useR2Storage && !string.IsNullOrWhiteSpace(r2PublicBaseUrl))
{
    app.Use(async (context, next) =>
    {
        if (context.Request.Path.StartsWithSegments("/uploads"))
        {
            var targetPath = context.Request.Path.Value?.Substring("/uploads".Length) ?? string.Empty;
            var localFilePath = Path.Combine(uploadsPath, targetPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));

            if (File.Exists(localFilePath))
            {
                await next();
                return;
            }

            var targetUrl = $"{r2PublicBaseUrl.TrimEnd('/')}/{targetPath.TrimStart('/')}";
            if (!string.IsNullOrWhiteSpace(context.Request.QueryString.Value))
                targetUrl += context.Request.QueryString.Value;

            context.Response.Redirect(targetUrl, permanent: false);
            return;
        }

        await next();
    });
}

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

async Task SeedDefaultSubscriptionPackageAsync(ApplicationDbContext context)
{
    if (await context.SubscriptionPackages.AnyAsync())
        return;

    context.SubscriptionPackages.Add(new SubscriptionPackage
    {
        Name = "Gói miễn phí",
        Price = 0,
        StorageLimitBytes = 1L * 1024 * 1024 * 1024,
        MaxFilesPerQuizGeneration = 1,
        MaxQuestionsPerQuiz = 10,
        IsDefault = true,
        UnlockedFeatures = new List<string> { "quiz_generator" },
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    });

    await context.SaveChangesAsync();
}

async Task AssignDefaultSubscriptionPackageToLecturersAsync(ApplicationDbContext context)
{
    var defaultPackage = await context.SubscriptionPackages.FirstOrDefaultAsync(sp => sp.IsDefault)
        ?? await context.SubscriptionPackages.FirstOrDefaultAsync();

    if (defaultPackage == null)
        return;

    var lecturersWithoutPackage = await context.Users
        .Where(u => u.Role == "Lecturer" && u.SubscriptionPackageId == null)
        .ToListAsync();

    if (lecturersWithoutPackage.Count == 0)
        return;

    foreach (var lecturer in lecturersWithoutPackage)
    {
        lecturer.SubscriptionPackageId = defaultPackage.Id;
        lecturer.UpdatedAt = DateTime.UtcNow;
    }

    await context.SaveChangesAsync();
}

async Task SeedDefaultCoinPackagesAsync(ApplicationDbContext context)
{
    if (await context.CoinPackages.AnyAsync())
        return;

    context.CoinPackages.AddRange(
        new CoinPackage
        {
            Name = "Gói 100 ECoin",
            Price = 49000,
            CoinAmount = 100,
            Description = "Gói khởi đầu cho nhu cầu tạo quiz nhỏ.",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        },
        new CoinPackage
        {
            Name = "Gói 300 ECoin",
            Price = 129000,
            CoinAmount = 300,
            Description = "Phù hợp cho giảng viên tạo quiz thường xuyên.",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        },
        new CoinPackage
        {
            Name = "Gói 1000 ECoin",
            Price = 349000,
            CoinAmount = 1000,
            Description = "Dành cho nhu cầu sử dụng AI với tần suất cao.",
            IsActive = true,
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
        await SeedDefaultSubscriptionPackageAsync(context);
        await AssignDefaultSubscriptionPackageToLecturersAsync(context);
        await SeedDefaultCoinPackagesAsync(context);
    }
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex, "Sample data seeding skipped at startup (DB may be unavailable).");
}

app.Run();

// Make Program class accessible for integration tests
public partial class Program { }
