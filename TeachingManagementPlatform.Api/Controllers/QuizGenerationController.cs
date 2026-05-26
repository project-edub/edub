using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Route("api/quiz")]
[Authorize(Roles = "Lecturer")]
public class QuizGenerationController : ControllerBase
{
    private readonly IFileParsingService _fileParsingService;
    private readonly IAIService _aiService;
    private readonly IQuizMappingService _mappingService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<QuizGenerationController> _logger;

    public QuizGenerationController(IFileParsingService fileParsingService, IAIService aiService, IQuizMappingService mappingService, IConfiguration configuration, ILogger<QuizGenerationController> logger)
    {
        _fileParsingService = fileParsingService;
        _aiService = aiService;
        _mappingService = mappingService;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromForm] QuizGenerationRequest request)
    {
        var files = Request.Form.Files;
        if (files == null || files.Count == 0)
            return BadRequest(new { error = new { code = "VALIDATION_ERROR", message = "Tệp nguồn bắt buộc" } });

        // Load limits from configuration
        var limitsSection = _configuration.GetSection("QuizGeneration:Limits");
        var maxQuestions = limitsSection.GetValue<int?>("MaxQuestions") ?? 30;
        var maxFileSizeMb = limitsSection.GetValue<int?>("MaxFileSizeMb") ?? 20;
        var maxFiles = limitsSection.GetValue<int?>("MaxFiles") ?? 5;
        var maxInputCharacters = limitsSection.GetValue<int?>("MaxInputCharacters") ?? 50000;
        var allowedExtensions = limitsSection.GetSection("AllowedExtensions").Get<string[]>() ?? new[] { ".docx", ".xlsx", ".pdf", ".pptx" };

        if (request.QuestionCount > maxQuestions)
            return BadRequest(new { error = new { code = "TOO_MANY_QUESTIONS", message = $"Số câu hỏi yêu cầu vượt quá giới hạn ({maxQuestions})." } });

        if (files.Count > maxFiles)
            return BadRequest(new { error = new { code = "TOO_MANY_FILES", message = $"Chỉ cho phép tối đa {maxFiles} tệp." } });

        var attachments = new List<AttachmentInfo>();
        foreach (var file in files)
        {
            if (!allowedExtensions.Contains(Path.GetExtension(file.FileName).ToLowerInvariant()))
                return BadRequest(new { error = new { code = "INVALID_EXTENSION", message = $"Định dạng tệp không hợp lệ: {file.FileName}. Hỗ trợ: {string.Join(',', allowedExtensions)}." } });

            if (file.Length > (long)maxFileSizeMb * 1024 * 1024)
                return BadRequest(new { error = new { code = "FILE_TOO_LARGE", message = $"Kích thước tệp vượt quá giới hạn {maxFileSizeMb} MB: {file.FileName}" } });
        }

        try
        {
            // Extract text from each file
            foreach (var f in files)
            {
                using var stream = f.OpenReadStream();
                var ext = Path.GetExtension(f.FileName).ToLowerInvariant();
                var content = await _fileParsingService.ExtractTextAsync(stream, ext);

                if (content.Length > maxInputCharacters)
                {
                    return BadRequest(new
                    {
                        error = new
                        {
                            code = "INPUT_TOO_LONG",
                            message = $"Nội dung trích xuất từ {f.FileName} ({content.Length} ký tự) vượt quá giới hạn {maxInputCharacters} ký tự. Vui lòng chọn phạm vi ngắn hơn hoặc tách tài liệu.",
                            extractedCharacters = content.Length,
                            maxAllowed = maxInputCharacters
                        }
                    });
                }

                attachments.Add(new AttachmentInfo { FileName = f.FileName, Content = content });
            }

            var quizContent = await _aiService.GenerateQuizAsync(
                new List<DocumentInfo>(),
                attachments,
                request.QuestionCount,
                request.Prompt,
                request.Topic,
                request.Difficulty,
                request.Language);

            var (questions, warnings) = _mappingService.ValidateAndMap(quizContent, request.QuestionCount);

            var response = new QuizGenerationResponse
            {
                RequestedQuestionCount = request.QuestionCount,
                GeneratedQuestionCount = questions.Count,
                Questions = questions,
                Warnings = warnings
            };

            return Ok(response);
        }
        catch (AIServiceException ex)
        {
            _logger.LogWarning(ex, "AIService failure");
            return StatusCode(502, new { error = new { code = "AI_ERROR", message = ex.Message } });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate quiz");
            return StatusCode(500, new { error = new { code = "INTERNAL_ERROR", message = "Không thể xử lý yêu cầu" } });
        }
    }

    [HttpPost("create-form")]
    public async Task<IActionResult> CreateForm([FromBody] CreateGoogleFormRequest request)
    {
        try
        {
            if (request.Questions == null || request.Questions.Count == 0)
                return BadRequest(new { error = new { code = "VALIDATION_ERROR", message = "Questions are required" } });

            var service = (IGoogleFormsService)HttpContext.RequestServices.GetService(typeof(IGoogleFormsService))!;
            var (formId, editUrl, driveWebView) = await service.CreateFormAsync(request.Title, request.Questions, request.TeacherGoogleEmail, request.GoogleAccessToken);

            return Ok(new { formId, editUrl, driveWebView });
        }
        catch (GoogleFormsConfigurationException ex)
        {
            _logger.LogWarning(ex, "Google Forms misconfiguration");
            return BadRequest(new { error = new { code = "GOOGLE_FORMS_CONFIG", message = ex.Message } });
        }
        catch (GoogleFormsException ex)
        {
            _logger.LogError(ex, "Google Forms runtime error");
            return StatusCode(502, new { error = new { code = "GOOGLE_FORMS_ERROR", message = "Failed to create or share Google Form. Check server logs for details." } });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error creating Google Form");
            return StatusCode(500, new { error = new { code = "INTERNAL_ERROR", message = "Không thể xử lý yêu cầu" } });
        }
    }
}
