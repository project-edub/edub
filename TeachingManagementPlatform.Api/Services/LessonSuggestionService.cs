using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

public class LessonSuggestionService : ILessonSuggestionService
{
    private readonly ApplicationDbContext _context;
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _embeddingModel;
    private readonly ILogger<LessonSuggestionService> _logger;

    private const double SimilarityThreshold = 0.75;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public LessonSuggestionService(
        ApplicationDbContext context,
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<LessonSuggestionService> logger)
    {
        _context = context;
        _httpClient = httpClient;
        _logger = logger;
        _apiKey = configuration["OpenAI:ApiKey"] ?? string.Empty;
        _embeddingModel = configuration["OpenAI:EmbeddingModel"] ?? "text-embedding-3-small";
    }

    public async Task<LessonSuggestionResponse> SuggestContentAsync(int lessonId, int lecturerId)
    {
        var lesson = await _context.Lessons
            .Include(l => l.LessonPlan)
            .FirstOrDefaultAsync(l => l.Id == lessonId);

        if (lesson == null || lesson.LessonPlan.LecturerId != lecturerId)
            throw new InvalidOperationException("Không tìm thấy bài học hoặc bạn không có quyền truy cập.");

        // ── Cache check: lessonId + SHA256(lessonName) ──
        var lessonNameHash = ComputeSha256Hash(lesson.Name);

        var cachedEntry = await _context.LessonSuggestionCaches
            .Where(c => c.LessonId == lessonId
                && c.LessonNameHash == lessonNameHash
                && c.ExpiresAt > DateTime.UtcNow)
            .FirstOrDefaultAsync();

        if (cachedEntry != null)
        {
            _logger.LogDebug("Cache hit for lesson {LessonId} with hash {Hash}", lessonId, lessonNameHash);
            return DeserializeCacheEntry(cachedEntry);
        }

        // ── Cache miss: call AI services ──
        _logger.LogDebug("Cache miss for lesson {LessonId}, calling AI services", lessonId);

        // Bước 2a: Match documents using embedding similarity
        var suggestedAttachments = await MatchDocumentsByEmbeddingAsync(lesson, lecturerId);

        var response = new LessonSuggestionResponse
        {
            SuggestedAttachments = suggestedAttachments,
            SuggestedKeywords = new List<string>(), // TODO (task 9.6): LLM keywords
            SuggestedQuizTopic = null,              // TODO (task 9.6): LLM quiz topic
            SuggestedCrosswordTopic = null           // TODO (task 9.6): LLM crossword topic
        };

        // ── Save to cache with 24h TTL ──
        await SaveToCacheAsync(lessonId, lessonNameHash, response);

        return response;
    }

    public async Task<bool> AcceptSuggestionAsync(int lessonId, int lecturerId, AcceptSuggestionRequest request)
    {
        var lesson = await _context.Lessons
            .Include(l => l.LessonPlan)
            .FirstOrDefaultAsync(l => l.Id == lessonId);

        if (lesson == null || lesson.LessonPlan.LecturerId != lecturerId)
            throw new InvalidOperationException("Không tìm thấy bài học hoặc bạn không có quyền truy cập.");

        switch (request.Type)
        {
            case "attachment":
                if (!int.TryParse(request.Value, out var fileId))
                    throw new InvalidOperationException("Giá trị fileId không hợp lệ.");

                var storageItem = await _context.StorageItems
                    .FirstOrDefaultAsync(s => s.Id == fileId);

                if (storageItem == null || storageItem.LecturerId != lecturerId)
                    throw new InvalidOperationException("Không tìm thấy tài liệu hoặc bạn không có quyền truy cập.");

                var attachment = new LessonAttachment
                {
                    LessonId = lessonId,
                    FileName = storageItem.Name,
                    FileReference = storageItem.FileReference ?? string.Empty,
                    FileSize = storageItem.FileSize ?? 0
                };

                _context.LessonAttachments.Add(attachment);
                await _context.SaveChangesAsync();
                return true;

            case "quiz_topic":
            case "crossword_topic":
                // Placeholder — actual generation handled elsewhere
                return true;

            default:
                throw new InvalidOperationException($"Loại gợi ý không hợp lệ: {request.Type}");
        }
    }

    /// <summary>
    /// Bước 2a: Matches documents in the lecturer's storage by computing embedding for the lesson
    /// and comparing cosine similarity with pre-computed storage item embeddings.
    /// Returns files with similarity > 0.75, sorted descending by similarity.
    /// If no files meet the threshold, returns an empty list.
    /// </summary>
    internal async Task<List<SuggestedAttachmentDto>> MatchDocumentsByEmbeddingAsync(Lesson lesson, int lecturerId)
    {
        // Build query text from lesson name + subject (as chapter/context)
        var queryText = BuildQueryText(lesson);

        // Compute embedding for the query text via OpenAI Embeddings API
        float[]? queryEmbedding;
        try
        {
            queryEmbedding = await ComputeEmbeddingAsync(queryText);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to compute embedding for lesson {LessonId}", lesson.Id);
            return new List<SuggestedAttachmentDto>();
        }

        if (queryEmbedding == null || queryEmbedding.Length == 0)
            return new List<SuggestedAttachmentDto>();

        // Get all pre-computed storage item embeddings for this lecturer's files only
        var storageEmbeddings = await _context.StorageItemEmbeddings
            .Include(sie => sie.StorageItem)
            .Where(sie => sie.StorageItem.LecturerId == lecturerId
                       && sie.StorageItem.ItemType == "File")
            .Select(sie => new
            {
                sie.StorageItemId,
                FileName = sie.StorageItem.Name,
                sie.Embedding
            })
            .ToListAsync();

        if (storageEmbeddings.Count == 0)
            return new List<SuggestedAttachmentDto>();

        // Calculate cosine similarity for each file and filter by threshold
        var results = new List<SuggestedAttachmentDto>();

        foreach (var item in storageEmbeddings)
        {
            var itemEmbedding = DeserializeEmbedding(item.Embedding);
            if (itemEmbedding == null || itemEmbedding.Length == 0)
                continue;

            var similarity = CosineSimilarity(queryEmbedding, itemEmbedding);

            if (similarity > SimilarityThreshold)
            {
                results.Add(new SuggestedAttachmentDto
                {
                    FileId = item.StorageItemId,
                    FileName = item.FileName,
                    Similarity = Math.Round(similarity, 4)
                });
            }
        }

        // Sort descending by similarity
        return results.OrderByDescending(r => r.Similarity).ToList();
    }

    /// <summary>
    /// Builds the query text for embedding from lesson name and LessonPlan subject.
    /// Format: "Subject - LessonName" (e.g., "Toán - Tập hợp các số hữu tỉ")
    /// </summary>
    internal static string BuildQueryText(Lesson lesson)
    {
        var parts = new List<string>();

        // Include subject from lesson plan as context
        if (lesson.LessonPlan != null && !string.IsNullOrWhiteSpace(lesson.LessonPlan.Subject))
        {
            parts.Add(lesson.LessonPlan.Subject);
        }

        // Lesson name is the primary content
        parts.Add(lesson.Name);

        return string.Join(" - ", parts);
    }

    /// <summary>
    /// Calls OpenAI Embeddings API (text-embedding-3-small) to compute a vector for the given text.
    /// Timeout: 15 seconds.
    /// </summary>
    internal async Task<float[]?> ComputeEmbeddingAsync(string text)
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            _logger.LogWarning("OpenAI API key is not configured. Skipping embedding computation.");
            return null;
        }

        var requestBody = new
        {
            model = _embeddingModel,
            input = text
        };

        var jsonContent = JsonSerializer.Serialize(requestBody);
        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/embeddings")
        {
            Content = new StringContent(jsonContent, Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(15));
        var response = await _httpClient.SendAsync(request, cts.Token);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            _logger.LogError("OpenAI Embeddings API returned {StatusCode}: {Body}",
                response.StatusCode, errorBody);
            return null;
        }

        var responseJson = await response.Content.ReadAsStringAsync();
        return ParseEmbeddingResponse(responseJson);
    }

    /// <summary>
    /// Parses the OpenAI embeddings API response to extract the float array.
    /// Expected format: { "data": [{ "embedding": [0.1, -0.2, ...] }] }
    /// </summary>
    internal static float[]? ParseEmbeddingResponse(string responseJson)
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

    /// <summary>
    /// Deserializes a JSON array string "[0.123, -0.456, ...]" into a float array.
    /// </summary>
    internal static float[]? DeserializeEmbedding(string? embeddingJson)
    {
        if (string.IsNullOrWhiteSpace(embeddingJson))
            return null;

        try
        {
            return JsonSerializer.Deserialize<float[]>(embeddingJson);
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Computes cosine similarity between two vectors.
    /// Returns a value between -1 and 1, where 1 means identical direction.
    /// </summary>
    internal static double CosineSimilarity(float[] vectorA, float[] vectorB)
    {
        if (vectorA.Length != vectorB.Length || vectorA.Length == 0)
            return 0.0;

        double dotProduct = 0.0;
        double magnitudeA = 0.0;
        double magnitudeB = 0.0;

        for (int i = 0; i < vectorA.Length; i++)
        {
            dotProduct += vectorA[i] * (double)vectorB[i];
            magnitudeA += vectorA[i] * (double)vectorA[i];
            magnitudeB += vectorB[i] * (double)vectorB[i];
        }

        magnitudeA = Math.Sqrt(magnitudeA);
        magnitudeB = Math.Sqrt(magnitudeB);

        if (magnitudeA == 0.0 || magnitudeB == 0.0)
            return 0.0;

        return dotProduct / (magnitudeA * magnitudeB);
    }

    // ── Cache Helpers ──

    /// <summary>
    /// Computes a SHA256 hash of the lesson name to create a stable hash for cache lookup.
    /// If the lesson name changes, the cache is automatically invalidated.
    /// </summary>
    internal static string ComputeSha256Hash(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static LessonSuggestionResponse DeserializeCacheEntry(LessonSuggestionCache cache)
    {
        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        var attachments = string.IsNullOrEmpty(cache.SuggestedAttachments)
            ? new List<SuggestedAttachmentDto>()
            : JsonSerializer.Deserialize<List<SuggestedAttachmentDto>>(cache.SuggestedAttachments, jsonOptions)
              ?? new List<SuggestedAttachmentDto>();

        var keywords = string.IsNullOrEmpty(cache.SuggestedKeywords)
            ? new List<string>()
            : JsonSerializer.Deserialize<List<string>>(cache.SuggestedKeywords, jsonOptions)
              ?? new List<string>();

        return new LessonSuggestionResponse
        {
            SuggestedAttachments = attachments,
            SuggestedKeywords = keywords,
            SuggestedQuizTopic = cache.SuggestedQuizTopic,
            SuggestedCrosswordTopic = cache.SuggestedCrosswordTopic
        };
    }

    private async Task SaveToCacheAsync(int lessonId, string lessonNameHash, LessonSuggestionResponse response)
    {
        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

        // Remove any existing cache entries for this lesson + hash (stale or expired)
        var existingEntries = await _context.LessonSuggestionCaches
            .Where(c => c.LessonId == lessonId && c.LessonNameHash == lessonNameHash)
            .ToListAsync();

        if (existingEntries.Count > 0)
        {
            _context.LessonSuggestionCaches.RemoveRange(existingEntries);
        }

        var cacheEntry = new LessonSuggestionCache
        {
            LessonId = lessonId,
            LessonNameHash = lessonNameHash,
            SuggestedAttachments = JsonSerializer.Serialize(response.SuggestedAttachments, jsonOptions),
            SuggestedKeywords = JsonSerializer.Serialize(response.SuggestedKeywords, jsonOptions),
            SuggestedQuizTopic = response.SuggestedQuizTopic,
            SuggestedCrosswordTopic = response.SuggestedCrosswordTopic,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(24)
        };

        _context.LessonSuggestionCaches.Add(cacheEntry);
        await _context.SaveChangesAsync();

        _logger.LogDebug("Cached suggestion for lesson {LessonId}, expires at {ExpiresAt}",
            lessonId, cacheEntry.ExpiresAt);
    }
}
