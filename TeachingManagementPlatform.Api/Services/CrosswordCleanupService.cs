using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;

namespace TeachingManagementPlatform.Api.Services;

/// <summary>
/// Background service that periodically clears expired SourceDocumentContent
/// from CrosswordGame records (FR-05).
/// Runs every hour and nullifies SourceDocumentContent for records where
/// SourceDocumentExpiresAt is in the past.
/// </summary>
public class CrosswordCleanupService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CrosswordCleanupService> _logger;

    public CrosswordCleanupService(
        IServiceScopeFactory scopeFactory,
        ILogger<CrosswordCleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("CrosswordCleanupService started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            await CleanupExpiredDocumentsAsync(stoppingToken);

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                // Graceful shutdown — exit the loop
                break;
            }
        }

        _logger.LogInformation("CrosswordCleanupService stopped.");
    }

    private async Task CleanupExpiredDocumentsAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            var now = DateTime.UtcNow;

            // Find all games with expired source document content
            var expiredGames = await dbContext.CrosswordGames
                .Where(g => g.SourceDocumentContent != null
                         && g.SourceDocumentExpiresAt.HasValue
                         && g.SourceDocumentExpiresAt.Value < now)
                .ToListAsync(cancellationToken);

            if (expiredGames.Count == 0)
            {
                _logger.LogDebug("CrosswordCleanupService: no expired documents found.");
                return;
            }

            foreach (var game in expiredGames)
            {
                game.SourceDocumentContent = null;
                game.UpdatedAt = now;
            }

            await dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "CrosswordCleanupService: cleared SourceDocumentContent for {Count} expired game(s).",
                expiredGames.Count);
        }
        catch (OperationCanceledException)
        {
            // Shutdown in progress — do not log as error
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "CrosswordCleanupService: error during cleanup.");
        }
    }
}
