using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;

namespace TeachingManagementPlatform.Api.Services;

public class FreeEcoinDailyTopUpService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<FreeEcoinDailyTopUpService> _logger;

    private static readonly string EcoinConfigPath = Path.Combine(AppContext.BaseDirectory, "game-ecoin-config.json");

    public FreeEcoinDailyTopUpService(IServiceProvider serviceProvider, ILogger<FreeEcoinDailyTopUpService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await TopUpFreeEcoins(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during daily free ECoin top-up");
            }

            // Run once per hour; the logic inside is idempotent per day
            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }

    private async Task TopUpFreeEcoins(CancellationToken ct)
    {
        var (dailyTopUp, maxPerAccount) = LoadConfig();
        if (dailyTopUp <= 0) return;

        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var todayUtc = DateTime.UtcNow.Date;

        // Find lecturers whose FreeEcoinBalance is below max and haven't been topped up today
        // We use UpdatedAt < today as a proxy (topped-up users get UpdatedAt = now)
        // More robust: only top up users whose FreeEcoinBalance < max
        var eligibleUsers = await context.Users
            .Where(u => u.Role == "Lecturer" && u.FreeEcoinBalance < maxPerAccount)
            .ToListAsync(ct);

        if (eligibleUsers.Count == 0) return;

        var now = DateTime.UtcNow;
        var toppedUp = 0;

        foreach (var user in eligibleUsers)
        {
            // Only top up once per day: skip if already updated today
            if (user.UpdatedAt.Date >= todayUtc) continue;

            var newBalance = Math.Min(user.FreeEcoinBalance + dailyTopUp, maxPerAccount);
            if (newBalance == user.FreeEcoinBalance) continue;

            user.FreeEcoinBalance = newBalance;
            user.UpdatedAt = now;
            toppedUp++;
        }

        if (toppedUp > 0)
        {
            await context.SaveChangesAsync(ct);
            _logger.LogInformation("Daily free ECoin top-up: {Count} users received +{Amount} (max {Max})",
                toppedUp, dailyTopUp, maxPerAccount);
        }
    }

    private (int dailyTopUp, int maxPerAccount) LoadConfig()
    {
        int dailyTopUp = 5;
        int maxPerAccount = 50;

        if (File.Exists(EcoinConfigPath))
        {
            try
            {
                var json = File.ReadAllText(EcoinConfigPath);
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                if (root.TryGetProperty("freeEcoinDailyTopUp", out var dtProp))
                    dailyTopUp = dtProp.GetInt32();
                else if (root.TryGetProperty("freeEcoinMonthlyTopUp", out var mtProp))
                    dailyTopUp = mtProp.GetInt32(); // backward compat

                if (root.TryGetProperty("freeEcoinMaxPerAccount", out var maxProp))
                    maxPerAccount = maxProp.GetInt32();
            }
            catch
            {
                // Use defaults
            }
        }

        return (dailyTopUp, maxPerAccount);
    }
}
