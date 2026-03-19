using System.Net.Http.Headers;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
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

    public async Task<QuizContent> GenerateQuizAsync(List<DocumentInfo> documents, List<AttachmentInfo> attachments)
    {
        var prompt = BuildPrompt(documents, attachments);

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

    internal static string BuildPrompt(List<DocumentInfo> documents, List<AttachmentInfo> attachments)
    {
        var sb = new StringBuilder();
        sb.AppendLine("Dựa trên các tài liệu giảng dạy sau, hãy tạo 5 câu hỏi trắc nghiệm.");
        sb.AppendLine("Trả về JSON theo format:");
        sb.AppendLine("{\"questions\":[{\"question\":\"...\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"correctAnswerIndex\":0}]}");
        sb.AppendLine();
        sb.AppendLine("Yêu cầu:");
        sb.AppendLine("- Mỗi câu hỏi có đúng 4 lựa chọn");
        sb.AppendLine("- correctAnswerIndex là chỉ số (0-3) của đáp án đúng");
        sb.AppendLine("- Chỉ trả về JSON, không thêm text khác");
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
