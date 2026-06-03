using System.Globalization;
using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

[assembly: InternalsVisibleTo("TeachingManagementPlatform.Tests")]

namespace TeachingManagementPlatform.Api.Services;

public class AIService : IAIService
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _model;
    private readonly ILogger<AIService> _logger;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    public AIService(HttpClient httpClient, IConfiguration configuration, ILogger<AIService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _apiKey = configuration["OpenAI:ApiKey"] ?? throw new InvalidOperationException("OpenAI:ApiKey is not configured.");
        _model = configuration["OpenAI:Model"] ?? "gpt-4o-mini";
    }

    public async Task<QuizContent> GenerateQuizAsync(
        List<DocumentInfo> documents,
        List<AttachmentInfo> attachments,
        int requestedQuestionCount = 5,
        string? customPrompt = null,
        string? topic = null,
        string? difficulty = null,
        string language = "vi")
    {
        var prompt = BuildPrompt(documents, attachments, requestedQuestionCount, customPrompt, topic, difficulty, language);

        var requestBody = new OpenAIRequest
        {
            Model = _model,
            Messages = new List<OpenAIMessage>
            {
                new() { Role = "system", Content = "Bạn là trợ lý tạo câu hỏi trắc nghiệm từ tài liệu giảng dạy. Trả về JSON hợp lệ theo đúng format yêu cầu." },
                new() { Role = "user", Content = prompt }
            },
            Temperature = 0.7
        };

        var jsonContent = JsonSerializer.Serialize(requestBody, JsonOptions);
        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions")
        {
            Content = new StringContent(jsonContent, Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.SendAsync(request);
        }
        catch (TaskCanceledException)
        {
            _logger.LogError("OpenAI API request timed out");
            throw new AIServiceException("Không thể tạo câu hỏi. Yêu cầu đã hết thời gian chờ. Vui lòng thử lại.");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "OpenAI API request failed");
            throw new AIServiceException("Không thể tạo câu hỏi. Vui lòng thử lại.");
        }

        if ((int)response.StatusCode == 429)
        {
            _logger.LogWarning("OpenAI API rate limit exceeded");
            throw new AIServiceException("Hệ thống đang quá tải. Vui lòng thử lại sau ít phút.");
        }

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            _logger.LogError("OpenAI API returned {StatusCode}: {Body}", response.StatusCode, errorBody);
            throw new AIServiceException("Không thể tạo câu hỏi. Vui lòng thử lại.");
        }

        var responseJson = await response.Content.ReadAsStringAsync();
        return ParseQuizResponse(responseJson);
    }

    public async Task<CrosswordAIResult> GenerateCrosswordAsync(
        List<AttachmentInfo> attachments,
        CrosswordGenerationConfig config)
    {
        var prompt = BuildCrosswordPrompt(attachments, config);

        const int maxRetries = 2;
        int attempt = 0;

        while (true)
        {
            attempt++;

            var requestBody = new OpenAIRequest
            {
                Model = _model,
                Messages = new List<OpenAIMessage>
                {
                    new() { Role = "system", Content = "Bạn là trợ lý giáo dục tạo từ vựng cho trò chơi ô chữ. Chỉ trả về JSON array hợp lệ theo đúng format yêu cầu." },
                    new() { Role = "user", Content = prompt }
                },
                Temperature = 0.7
            };

            var jsonContent = JsonSerializer.Serialize(requestBody, JsonOptions);
            var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions")
            {
                Content = new StringContent(jsonContent, Encoding.UTF8, "application/json")
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

            HttpResponseMessage response;
            try
            {
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
                response = await _httpClient.SendAsync(request, cts.Token);
            }
            catch (TaskCanceledException)
            {
                _logger.LogError("OpenAI API request timed out (attempt {Attempt})", attempt);
                throw new AIServiceException("Không thể tạo ô chữ. Yêu cầu đã hết thời gian chờ. Vui lòng thử lại.");
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "OpenAI API request failed (attempt {Attempt})", attempt);
                throw new AIServiceException("Không thể tạo ô chữ. Vui lòng thử lại.");
            }

            // Retry on 5xx errors
            if ((int)response.StatusCode >= 500)
            {
                _logger.LogWarning("OpenAI API returned {StatusCode} on attempt {Attempt}", response.StatusCode, attempt);
                if (attempt < maxRetries)
                    continue;

                throw new AIServiceException("Không thể tạo ô chữ. Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại.");
            }

            if ((int)response.StatusCode == 429)
            {
                _logger.LogWarning("OpenAI API rate limit exceeded");
                throw new AIServiceException("Hệ thống đang quá tải. Vui lòng thử lại sau ít phút.");
            }

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                _logger.LogError("OpenAI API returned {StatusCode}: {Body}", response.StatusCode, errorBody);
                throw new AIServiceException("Không thể tạo ô chữ. Vui lòng thử lại.");
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            return ParseCrosswordResponse(responseJson);
        }
    }

    internal static string BuildCrosswordPrompt(List<AttachmentInfo> attachments, CrosswordGenerationConfig config)
    {
        var excludeWordsText = config.ExcludeWords.Count > 0
            ? string.Join(", ", config.ExcludeWords)
            : "(không có)";

        var sb = new StringBuilder();
        sb.AppendLine($"Bạn là trợ lý giáo dục chuyên tạo trò chơi ô chữ. Hãy tạo ĐÚNG {config.WordCount} từ vựng cho trò chơi ô chữ từ tài liệu đính kèm.");
        sb.AppendLine();
        sb.AppendLine("QUY TẮC BẮT BUỘC VỀ Ô CHỮ:");
        sb.AppendLine("- Tất cả các từ PHẢI có thể xếp vào cùng một lưới ô chữ liên thông.");
        sb.AppendLine("- Các từ phải chia sẻ ít nhất 1 chữ cái chung với ít nhất 1 từ khác trong danh sách.");
        sb.AppendLine("- Ưu tiên chọn các từ có nhiều chữ cái phổ biến (A, E, I, O, U, N, T, R, S, L) để dễ giao nhau.");
        sb.AppendLine("- Từ phải có độ dài từ 3 đến 12 ký tự (không dấu).");
        sb.AppendLine("- KHÔNG được tạo các từ quá khó xếp (không có chữ cái chung với từ nào khác).");
        sb.AppendLine("- Trước khi trả về, hãy kiểm tra rằng mỗi từ chia sẻ ít nhất 1 ký tự với ít nhất 1 từ khác.");
        sb.AppendLine();
        sb.AppendLine("Yêu cầu nội dung:");
        sb.AppendLine($"- Ngôn ngữ: {config.Language} (vi = tiếng Việt, en = tiếng Anh)");
        sb.AppendLine($"- Độ khó: {config.Difficulty} (easy/medium/hard)");
        sb.AppendLine($"- Chủ đề gợi ý: {config.Topic ?? "(không có)"} (nếu có)");
        sb.AppendLine($"- Kiểu gợi ý: {config.ClueStyle} (definition = định nghĩa, fill-in-blank = điền vào chỗ trống)");
        sb.AppendLine($"- Loại trừ các từ: {excludeWordsText} (nếu có)");
        sb.AppendLine();
        sb.AppendLine("Trả về JSON array với format:");
        sb.AppendLine("[");
        sb.AppendLine("  {");
        sb.AppendLine("    \"word\": \"UPPERCASE_NO_DIACRITICS\",");
        sb.AppendLine("    \"displayWord\": \"Từ gốc có dấu\",");
        sb.AppendLine("    \"clue\": \"Câu gợi ý\",");
        sb.AppendLine("    \"difficulty\": \"easy|medium|hard\",");
        sb.AppendLine("    \"sourceContext\": \"Đoạn văn bản nguồn (tùy chọn)\"");
        sb.AppendLine("  }");
        sb.AppendLine("]");
        sb.AppendLine();
        sb.AppendLine("LƯU Ý QUAN TRỌNG:");
        sb.AppendLine("- Trường \"word\" phải là CHỮ IN HOA, KHÔNG DẤU, chỉ gồm A-Z.");
        sb.AppendLine("- Đảm bảo mỗi từ chia sẻ ít nhất 1 chữ cái với từ khác trong danh sách.");
        sb.AppendLine("- Chỉ trả về JSON array, không có text khác.");

        if (attachments.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine("=== Nội dung tệp đính kèm ===");
            foreach (var att in attachments)
            {
                sb.AppendLine($"--- {att.FileName} ---");
                sb.AppendLine(att.Content);
                sb.AppendLine();
            }
        }

        return sb.ToString();
    }

    internal static CrosswordAIResult ParseCrosswordResponse(string responseJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(responseJson);
            var content = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            if (string.IsNullOrWhiteSpace(content))
                throw new AIServiceException("Không thể tạo ô chữ. Phản hồi từ AI trống.");

            // Strip markdown code fences if present
            var cleaned = content.Trim();
            if (cleaned.StartsWith("```"))
            {
                var firstNewline = cleaned.IndexOf('\n');
                if (firstNewline >= 0)
                    cleaned = cleaned[(firstNewline + 1)..];
                if (cleaned.EndsWith("```"))
                    cleaned = cleaned[..^3].Trim();
            }

            var rawItems = JsonSerializer.Deserialize<List<CrosswordWordRaw>>(cleaned, JsonOptions);
            if (rawItems == null || rawItems.Count == 0)
                throw new AIServiceException("Không thể tạo ô chữ. Phản hồi từ AI không hợp lệ.");

            var words = new List<CrosswordWordDto>();
            foreach (var item in rawItems)
            {
                // Validate required fields
                if (string.IsNullOrWhiteSpace(item.Word) ||
                    string.IsNullOrWhiteSpace(item.DisplayWord) ||
                    string.IsNullOrWhiteSpace(item.Clue))
                {
                    continue; // Skip invalid entries
                }

                words.Add(new CrosswordWordDto
                {
                    Word = NormalizeWord(item.Word),
                    DisplayWord = item.DisplayWord,
                    Clue = item.Clue,
                    Difficulty = item.Difficulty ?? "medium",
                    SourceContext = item.SourceContext
                });
            }

            if (words.Count == 0)
                throw new AIServiceException("Không thể tạo ô chữ. Không có từ hợp lệ trong phản hồi từ AI.");

            return new CrosswordAIResult { Words = words };
        }
        catch (AIServiceException)
        {
            throw;
        }
        catch (Exception ex)
        {
            throw new AIServiceException("Không thể tạo ô chữ. Vui lòng thử lại.", ex);
        }
    }

    /// <summary>
    /// Normalizes a word: NFD decompose → remove diacritics → replace đ/Đ with d/D → uppercase → keep only A-Z and underscore.
    /// </summary>
    internal static string NormalizeWord(string word)
    {
        if (string.IsNullOrEmpty(word))
            return string.Empty;

        // Replace đ/Đ before NFD decomposition (they don't decompose to d + combining mark)
        var result = word.Replace('đ', 'd').Replace('Đ', 'D');

        // NFD decompose and remove combining diacritical marks
        result = result.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();
        foreach (var ch in result)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(ch) != UnicodeCategory.NonSpacingMark)
                sb.Append(ch);
        }

        // Uppercase and keep only A-Z and underscore
        result = sb.ToString().ToUpperInvariant();
        result = Regex.Replace(result, @"[^A-Z_]", string.Empty);

        return result;
    }

    // Raw DTO for deserializing AI JSON response
    private class CrosswordWordRaw
    {
        [JsonPropertyName("word")]
        public string? Word { get; set; }

        [JsonPropertyName("displayWord")]
        public string? DisplayWord { get; set; }

        [JsonPropertyName("clue")]
        public string? Clue { get; set; }

        [JsonPropertyName("difficulty")]
        public string? Difficulty { get; set; }

        [JsonPropertyName("sourceContext")]
        public string? SourceContext { get; set; }
    }

    internal static string BuildPrompt(
        List<DocumentInfo> documents,
        List<AttachmentInfo> attachments,
        int requestedQuestionCount = 5,
        string? customPrompt = null,
        string? topic = null,
        string? difficulty = null,
        string language = "vi")
    {
        requestedQuestionCount = Math.Clamp(requestedQuestionCount, 1, 30);

        var sb = new StringBuilder();
        sb.AppendLine($"Dựa trên các tài liệu giảng dạy sau, hãy tạo đúng {requestedQuestionCount} câu hỏi trắc nghiệm.");
        sb.AppendLine("Trả về JSON theo format:");
        sb.AppendLine("{\"questions\":[{\"question\":\"...\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"correctAnswerIndex\":0}]}");
        sb.AppendLine();
        sb.AppendLine("Yêu cầu:");
        sb.AppendLine($"- Tạo đúng {requestedQuestionCount} câu hỏi");
        sb.AppendLine("- Mỗi câu hỏi có đúng 4 lựa chọn");
        sb.AppendLine("- correctAnswerIndex là chỉ số (0-3) của đáp án đúng");
        sb.AppendLine("- Chỉ trả về JSON, không thêm text khác");

        if (!string.IsNullOrWhiteSpace(language))
            sb.AppendLine($"- Ngôn ngữ câu hỏi: {language}");
        if (!string.IsNullOrWhiteSpace(topic))
            sb.AppendLine($"- Chủ đề ưu tiên: {topic}");
        if (!string.IsNullOrWhiteSpace(difficulty))
            sb.AppendLine($"- Mức độ khó: {difficulty}");

        if (!string.IsNullOrWhiteSpace(customPrompt))
        {
            sb.AppendLine();
            sb.AppendLine("Yêu cầu bổ sung từ giảng viên:");
            sb.AppendLine(customPrompt.Trim());
        }

        sb.AppendLine();

        if (documents.Count > 0)
        {
            sb.AppendLine("=== Tài liệu ===");
            foreach (var doc in documents)
            {
                sb.AppendLine($"- Tên: {doc.Name}");
                sb.AppendLine($"  Link: {doc.Link}");
                if (!string.IsNullOrEmpty(doc.PageRange))
                    sb.AppendLine($"  Trang: {doc.PageRange}");
            }
            sb.AppendLine();
        }

        if (attachments.Count > 0)
        {
            sb.AppendLine("=== Nội dung tệp đính kèm ===");
            foreach (var att in attachments)
            {
                sb.AppendLine($"--- {att.FileName} ---");
                sb.AppendLine(att.Content);
                sb.AppendLine();
            }
        }

        return sb.ToString();
    }

    internal static QuizContent ParseQuizResponse(string responseJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(responseJson);
            var content = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            if (string.IsNullOrWhiteSpace(content))
                throw new AIServiceException("Không thể tạo câu hỏi. Phản hồi từ AI trống.");

            // Strip markdown code fences if present
            var cleaned = content.Trim();
            if (cleaned.StartsWith("```"))
            {
                var firstNewline = cleaned.IndexOf('\n');
                if (firstNewline >= 0)
                    cleaned = cleaned[(firstNewline + 1)..];
                if (cleaned.EndsWith("```"))
                    cleaned = cleaned[..^3].Trim();
            }

            var quiz = JsonSerializer.Deserialize<QuizContent>(cleaned, JsonOptions);
            if (quiz == null || quiz.Questions.Count == 0)
                throw new AIServiceException("Không thể tạo câu hỏi. Phản hồi từ AI không hợp lệ.");

            return quiz;
        }
        catch (AIServiceException)
        {
            throw;
        }
        catch (Exception ex)
        {
            throw new AIServiceException("Không thể tạo câu hỏi. Vui lòng thử lại.", ex);
        }
    }

    // Internal DTOs for OpenAI API
    private class OpenAIRequest
    {
        [JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;

        [JsonPropertyName("messages")]
        public List<OpenAIMessage> Messages { get; set; } = new();

        [JsonPropertyName("temperature")]
        public double Temperature { get; set; }
    }

    private class OpenAIMessage
    {
        [JsonPropertyName("role")]
        public string Role { get; set; } = string.Empty;

        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;
    }
}

public class AIServiceException : Exception
{
    public AIServiceException(string message) : base(message) { }
    public AIServiceException(string message, Exception innerException) : base(message, innerException) { }
}
