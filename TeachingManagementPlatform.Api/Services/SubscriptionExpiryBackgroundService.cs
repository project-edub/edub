using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;

namespace TeachingManagementPlatform.Api.Services;

public class SubscriptionExpiryBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<SubscriptionExpiryBackgroundService> _logger;

    public SubscriptionExpiryBackgroundService(IServiceProvider serviceProvider, ILogger<SubscriptionExpiryBackgroundService> logger)
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
                await CheckExpiredSubscriptions(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking expired subscriptions");
            }

            // Run once per hour
            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }

    private async Task CheckExpiredSubscriptions(CancellationToken ct)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var now = DateTime.UtcNow;

        // Find users whose subscription has expired
        var expiredUsers = await context.Users
            .Where(u => u.Role == "Lecturer"
                && u.SubscriptionExpiresAt != null
                && u.SubscriptionExpiresAt <= now
                && u.SubscriptionPackageId != null)
            .ToListAsync(ct);

        if (expiredUsers.Count == 0) return;

        // Get the default (free) package
        var defaultPackage = await context.SubscriptionPackages
            .FirstOrDefaultAsync(sp => sp.IsDefault, ct);

        foreach (var user in expiredUsers)
        {
            user.SubscriptionPackageId = defaultPackage?.Id;
            user.SubscriptionExpiresAt = null;
            user.UpdatedAt = now;
        }

        await context.SaveChangesAsync(ct);
        _logger.LogInformation("Expired {Count} subscriptions, switched to free plan", expiredUsers.Count);
    }
}
