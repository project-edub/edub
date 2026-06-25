using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

/// <summary>
/// Background service that periodically computes embeddings for StorageItems that don't have one yet.
/// Runs every 5 minutes and processes up to 10 files per batch to avoid overwhelming the API.
/// Uses OpenAI text-embedding-3-small model with the file name as input text.
/// Requirements: 5.5 — pre-compute embedding
/// </summary>
public class StorageEmbeddingBackgroundService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(5);
    private const int BatchSize = 10;

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<StorageEmbeddingBackgroundService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    public StorageEmbeddingBackgroundService(
        IServiceScopeFactory scopeFactory,
        IConfiguration configuration,
        ILogger<StorageEmbeddingBackgroundService> logger,
        IHttpClientFactory httpClientFactory)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("StorageEmbeddingBackgroundService started.");

        // Initial delay to let the app fully start
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            await ComputeMissingEmbeddingsAsync(stoppingToken);

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("StorageEmbeddingBackgroundService stopped.");
    }

    /// <summary>
    /// Finds StorageItems (files) that don't have an embedding yet and computes embeddings for them.
    /// Processes up to BatchSize items per run to rate-limit API calls.
    /// </summary>
    private async Task ComputeMissingEmbeddingsAsync(CancellationToken cancellationToken)
    {
        var apiKey = _configuration["OpenAI:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            _logger.LogDebug("StorageEmbeddingBackgroundService: OpenAI:ApiKey not configured, skipping.");
            return;
        }

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            // Find files that don't have an embedding yet
            var itemsWithoutEmbedding = await dbContext.StorageItems
                .Where(si => si.ItemType == "File")
                .Where(si => !dbContext.StorageItemEmbeddings.Any(e => e.StorageItemId == si.Id))
                .OrderBy(si => si.CreatedAt)
                .Take(BatchSize)
                .Select(si => new { si.Id, si.Name })
                .ToListAsync(cancellationToken);

            if (itemsWithoutEmbedding.Count == 0)
            {
                _logger.LogDebug("StorageEmbeddingBackgroundService: no files without embedding found.");
                return;
            }

            _logger.LogInformation(
                "StorageEmbeddingBackgroundService: processing {Count} file(s) for embedding computation.",
                itemsWithoutEmbedding.Count);

            var embeddingModel = _configuration["OpenAI:EmbeddingModel"] ?? "text-embedding-3-small";
            var httpClient = _httpClientFactory.CreateClient();

            foreach (var item in itemsWithoutEmbedding)
            {
                if (cancellationToken.IsCancellationRequested)
                    break;

                try
                {
                    var embedding = await ComputeEmbeddingAsync(httpClient, apiKey, embeddingModel, item.Name, cancellationToken);

                    if (embedding != null && embedding.Length > 0)
                    {
                        var embeddingEntity = new StorageItemEmbedding
                        {
                            StorageItemId = item.Id,
                            Embedding = JsonSerializer.Serialize(embedding),
                            ComputedAt = DateTime.UtcNow
                        };

                        dbContext.StorageItemEmbeddings.Add(embeddingEntity);
                        await dbContext.SaveChangesAsync(cancellationToken);

                        _logger.LogDebug(
                            "StorageEmbeddingBackgroundService: computed embedding for StorageItem {ItemId} ({FileName}).",
                            item.Id, item.Name);
                    }
                    else
                    {
                        _logger.LogWarning(
                            "StorageEmbeddingBackgroundService: empty embedding returned for StorageItem {ItemId} ({FileName}).",
                            item.Id, item.Name);
                    }

                    // Rate-limit: small delay between API calls
                    await Task.Delay(TimeSpan.FromMilliseconds(500), cancellationToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex,
                        "StorageEmbeddingBackgroundService: failed to compute embedding for StorageItem {ItemId} ({FileName}).",
                        item.Id, item.Name);
                    // Continue with next item — don't let one failure stop the batch
                }
            }

            _logger.LogInformation("StorageEmbeddingBackgroundService: batch processing complete.");
        }
        catch (OperationCanceledException)
        {
            // Shutdown in progress
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "StorageEmbeddingBackgroundService: error during embedding computation.");
        }
    }

    /// <summary>
    /// Calls OpenAI Embeddings API to compute a vector for the given text (file name).
    /// Uses text-embedding-3-small model with a 15 second timeout.
    /// </summary>
    private static async Task<float[]?> ComputeEmbeddingAsync(
        HttpClient httpClient,
        string apiKey,
        string model,
        string inputText,
        CancellationToken cancellationToken)
    {
        var requestBody = new
        {
            model,
            input = inputText
        };

        var jsonContent = JsonSerializer.Serialize(requestBody);
        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/embeddings")
        {
            Content = new StringContent(jsonContent, Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(15));

        var response = await httpClient.SendAsync(request, cts.Token);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new HttpRequestException(
                $"OpenAI Embeddings API returned {response.StatusCode}: {errorBody}");
        }

        var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);
        return ParseEmbeddingResponse(responseJson);
    }

    /// <summary>
    /// Parses the OpenAI embeddings API response to extract the float array.
    /// Expected format: { "data": [{ "embedding": [0.1, -0.2, ...] }] }
    /// </summary>
    private static float[]? ParseEmbeddingResponse(string responseJson)
    {
        using var doc = JsonDocument.Parse(responseJson);

        if (!doc.RootElement.TryGetProperty("data", out var dataArray))
            return null;

        var firstItem = dataArray.EnumerateArray().FirstOrDefault();
        if (firstItem.ValueKind == JsonValueKind.Undefined)
            return null;

        if (!firstItem.TryGetProperty("embedding", out var embeddingElement))
            return null;

        var embedding = new List<float>();
        foreach (var value in embeddingElement.EnumerateArray())
        {
            embedding.Add(value.GetSingle());
        }

        return embedding.ToArray();
    }
}
