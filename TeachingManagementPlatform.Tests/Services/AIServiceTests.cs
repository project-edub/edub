using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Tests.Services;

public class AIServiceTests
{
    private static IConfiguration CreateConfig(string apiKey = "test-key", string model = "gpt-4o-mini")
    {
        var inMemory = new Dictionary<string, string?>
        {
            ["OpenAI:ApiKey"] = apiKey,
            ["OpenAI:Model"] = model
        };
        return new ConfigurationBuilder().AddInMemoryCollection(inMemory).Build();
    }

    private static ILogger<AIService> CreateLogger() =>
        LoggerFactory.Create(b => { }).CreateLogger<AIService>();

    private static string BuildOpenAIResponse(string content) =>
        JsonSerializer.Serialize(new
        {
            choices = new[]
            {
                new { message = new { content } }
            }
        });

    private static string ValidQuizJson => JsonSerializer.Serialize(new
    {
        questions = new[]
        {
            new
            {
                question = "Câu hỏi 1?",
                options = new[] { "A", "B", "C", "D" },
                correctAnswerIndex = 0
            },
            new
            {
                question = "Câu hỏi 2?",
                options = new[] { "A", "B", "C", "D" },
                correctAnswerIndex = 2
            }
        }
    });

    #region GenerateQuizAsync - Success

    [Fact]
    public async Task GenerateQuizAsync_ValidResponse_ReturnsQuizContent()
    {
        var responseBody = BuildOpenAIResponse(ValidQuizJson);
        var handler = new FakeHttpMessageHandler(new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent(responseBody, Encoding.UTF8, "application/json")
        });
        var httpClient = new HttpClient(handler);
        var service = new AIService(httpClient, CreateConfig(), CreateLogger());

        var documents = new List<DocumentInfo>
        {
            new() { Name = "Bài 1", Link = "https://example.com/doc1", PageRange = "1-5" }
        };
        var attachments = new List<AttachmentInfo>
        {
            new() { FileName = "notes.txt", Content = "Nội dung bài giảng" }
        };

        var result = await service.GenerateQuizAsync(documents, attachments);

        Assert.NotNull(result);
        Assert.Equal(2, result.Questions.Count);
        Assert.Equal("Câu hỏi 1?", result.Questions[0].Question);
        Assert.Equal(4, result.Questions[0].Options.Count);
        Assert.Equal(0, result.Questions[0].CorrectAnswerIndex);
        Assert.Equal(2, result.Questions[1].CorrectAnswerIndex);
    }

    [Fact]
    public async Task GenerateQuizAsync_ResponseWithCodeFences_ParsesCorrectly()
    {
        var wrappedJson = $"```json\n{ValidQuizJson}\n```";
        var responseBody = BuildOpenAIResponse(wrappedJson);
        var handler = new FakeHttpMessageHandler(new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent(responseBody, Encoding.UTF8, "application/json")
        });
        var httpClient = new HttpClient(handler);
        var service = new AIService(httpClient, CreateConfig(), CreateLogger());

        var result = await service.GenerateQuizAsync(new List<DocumentInfo>(), new List<AttachmentInfo>());

        Assert.NotNull(result);
        Assert.Equal(2, result.Questions.Count);
    }

    #endregion

    #region GenerateQuizAsync - Error Handling

    [Fact]
    public async Task GenerateQuizAsync_RateLimited_ThrowsWithVietnameseMessage()
    {
        var handler = new FakeHttpMessageHandler(new HttpResponseMessage
        {
            StatusCode = (HttpStatusCode)429,
            Content = new StringContent("{\"error\":\"rate_limit\"}")
        });
        var httpClient = new HttpClient(handler);
        var service = new AIService(httpClient, CreateConfig(), CreateLogger());

        var ex = await Assert.ThrowsAsync<AIServiceException>(
            () => service.GenerateQuizAsync(new List<DocumentInfo>(), new List<AttachmentInfo>()));

        Assert.Contains("quá tải", ex.Message);
    }

    [Fact]
    public async Task GenerateQuizAsync_ServerError_ThrowsWithVietnameseMessage()
    {
        var handler = new FakeHttpMessageHandler(new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.InternalServerError,
            Content = new StringContent("{\"error\":\"server_error\"}")
        });
        var httpClient = new HttpClient(handler);
        var service = new AIService(httpClient, CreateConfig(), CreateLogger());

        var ex = await Assert.ThrowsAsync<AIServiceException>(
            () => service.GenerateQuizAsync(new List<DocumentInfo>(), new List<AttachmentInfo>()));

        Assert.Contains("Không thể tạo câu hỏi", ex.Message);
    }

    [Fact]
    public async Task GenerateQuizAsync_Timeout_ThrowsWithVietnameseMessage()
    {
        var handler = new FakeHttpMessageHandler(throwOnSend: true,
            exception: new TaskCanceledException("Request timed out"));
        var httpClient = new HttpClient(handler);
        var service = new AIService(httpClient, CreateConfig(), CreateLogger());

        var ex = await Assert.ThrowsAsync<AIServiceException>(
            () => service.GenerateQuizAsync(new List<DocumentInfo>(), new List<AttachmentInfo>()));

        Assert.Contains("hết thời gian chờ", ex.Message);
    }

    [Fact]
    public async Task GenerateQuizAsync_NetworkError_ThrowsWithVietnameseMessage()
    {
        var handler = new FakeHttpMessageHandler(throwOnSend: true,
            exception: new HttpRequestException("Connection refused"));
        var httpClient = new HttpClient(handler);
        var service = new AIService(httpClient, CreateConfig(), CreateLogger());

        var ex = await Assert.ThrowsAsync<AIServiceException>(
            () => service.GenerateQuizAsync(new List<DocumentInfo>(), new List<AttachmentInfo>()));

        Assert.Contains("Không thể tạo câu hỏi", ex.Message);
    }

    [Fact]
    public async Task GenerateQuizAsync_EmptyContent_ThrowsWithVietnameseMessage()
    {
        var responseBody = BuildOpenAIResponse("");
        var handler = new FakeHttpMessageHandler(new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent(responseBody, Encoding.UTF8, "application/json")
        });
        var httpClient = new HttpClient(handler);
        var service = new AIService(httpClient, CreateConfig(), CreateLogger());

        var ex = await Assert.ThrowsAsync<AIServiceException>(
            () => service.GenerateQuizAsync(new List<DocumentInfo>(), new List<AttachmentInfo>()));

        Assert.Contains("trống", ex.Message);
    }

    [Fact]
    public async Task GenerateQuizAsync_InvalidJson_ThrowsWithVietnameseMessage()
    {
        var responseBody = BuildOpenAIResponse("not valid json at all");
        var handler = new FakeHttpMessageHandler(new HttpResponseMessage
        {
            StatusCode = HttpStatusCode.OK,
            Content = new StringContent(responseBody, Encoding.UTF8, "application/json")
        });
        var httpClient = new HttpClient(handler);
        var service = new AIService(httpClient, CreateConfig(), CreateLogger());

        var ex = await Assert.ThrowsAsync<AIServiceException>(
            () => service.GenerateQuizAsync(new List<DocumentInfo>(), new List<AttachmentInfo>()));

        Assert.Contains("Không thể tạo câu hỏi", ex.Message);
    }

    #endregion

    #region BuildPrompt

    [Fact]
    public void BuildPrompt_IncludesDocumentInfo()
    {
        var docs = new List<DocumentInfo>
        {
            new() { Name = "Toán học", Link = "https://example.com/math", PageRange = "10-20" }
        };

        var prompt = AIService.BuildPrompt(docs, new List<AttachmentInfo>());

        Assert.Contains("Toán học", prompt);
        Assert.Contains("https://example.com/math", prompt);
        Assert.Contains("10-20", prompt);
    }

    [Fact]
    public void BuildPrompt_IncludesAttachmentContent()
    {
        var attachments = new List<AttachmentInfo>
        {
            new() { FileName = "bai_giang.txt", Content = "Nội dung bài giảng về lịch sử" }
        };

        var prompt = AIService.BuildPrompt(new List<DocumentInfo>(), attachments);

        Assert.Contains("bai_giang.txt", prompt);
        Assert.Contains("Nội dung bài giảng về lịch sử", prompt);
    }

    [Fact]
    public void BuildPrompt_EmptyInputs_StillProducesValidPrompt()
    {
        var prompt = AIService.BuildPrompt(new List<DocumentInfo>(), new List<AttachmentInfo>());

        Assert.Contains("câu hỏi trắc nghiệm", prompt);
        Assert.Contains("JSON", prompt);
    }

    #endregion

    #region ParseQuizResponse

    [Fact]
    public void ParseQuizResponse_ValidResponse_ReturnsQuizContent()
    {
        var responseJson = BuildOpenAIResponse(ValidQuizJson);

        var result = AIService.ParseQuizResponse(responseJson);

        Assert.Equal(2, result.Questions.Count);
        Assert.Equal("Câu hỏi 1?", result.Questions[0].Question);
    }

    [Fact]
    public void ParseQuizResponse_EmptyQuestions_Throws()
    {
        var emptyQuiz = JsonSerializer.Serialize(new { questions = Array.Empty<object>() });
        var responseJson = BuildOpenAIResponse(emptyQuiz);

        Assert.Throws<AIServiceException>(() => AIService.ParseQuizResponse(responseJson));
    }

    #endregion

    #region Configuration

    [Fact]
    public void Constructor_MissingApiKey_ThrowsInvalidOperation()
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>())
            .Build();

        Assert.Throws<InvalidOperationException>(
            () => new AIService(new HttpClient(), config, CreateLogger()));
    }

    #endregion

    /// <summary>
    /// Fake HttpMessageHandler for testing HTTP calls without real network requests.
    /// </summary>
    private class FakeHttpMessageHandler : HttpMessageHandler
    {
        private readonly HttpResponseMessage? _response;
        private readonly bool _throwOnSend;
        private readonly Exception? _exception;

        public FakeHttpMessageHandler(HttpResponseMessage response)
        {
            _response = response;
        }

        public FakeHttpMessageHandler(bool throwOnSend, Exception exception)
        {
            _throwOnSend = throwOnSend;
            _exception = exception;
        }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            if (_throwOnSend && _exception != null)
                throw _exception;

            return Task.FromResult(_response!);
        }
    }
}
