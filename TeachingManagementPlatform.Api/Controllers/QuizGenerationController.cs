using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Route("api/quiz")]
[Authorize(Roles = "Lecturer")]
public class QuizGenerationController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IFileParsingService _fileParsingService;
    private readonly IAIService _aiService;
    private readonly IQuizMappingService _mappingService;
    private readonly ICoinService _coinService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<QuizGenerationController> _logger;

    public QuizGenerationController(
        ApplicationDbContext context,
        IFileParsingService fileParsingService,
        IAIService aiService,
        IQuizMappingService mappingService,
        ICoinService coinService,
        IConfiguration configuration,
        ILogger<QuizGenerationController> logger)
    {
        _context = context;
        _fileParsingService = fileParsingService;
        _aiService = aiService;
        _mappingService = mappingService;
        _coinService = coinService;
        _configuration = configuration;
        _logger = logger;
    }

    // POST /api/quiz/generate
    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromForm] QuizGenerationRequest request)
    {
        var files = Request.Form.Files;
        if (files == null || files.Count == 0)
            return BadRequest(new { error = new { code = "VALIDATION_ERROR", message = "Tệp nguồn bắt buộc." } });

        var userId = GetUserId();

        var limitsSection = _configuration.GetSection("QuizGeneration:Limits");
        var maxQuestions = limitsSection.GetValue<int?>("MaxQuestions") ?? 30;
        var maxFileSizeMb = limitsSection.GetValue<int?>("MaxFileSizeMb") ?? 20;
        var maxFiles = limitsSection.GetValue<int?>("MaxFiles") ?? 5;
        var maxInputCharacters = limitsSection.GetValue<int?>("MaxInputCharacters") ?? 50000;
        var allowedExtensions = limitsSection.GetSection("AllowedExtensions").Get<string[]>() ?? new[] { ".docx", ".xlsx", ".pdf", ".pptx" };

        if (request.QuestionCount > maxQuestions)
            return BadRequest(new { error = new { code = "TOO_MANY_QUESTIONS", message = $"Số câu hỏi yêu cầu vượt quá giới hạn ({maxQuestions})." } });

        var coinCostPerQuestion = _configuration.GetValue<int?>("QuizGeneration:CoinCostPerQuestion") ?? 1;
        var requiredCoin = Math.Max(1, request.QuestionCount) * Math.Max(1, coinCostPerQuestion);
        var currentCoinBalance = await _coinService.GetBalanceAsync(userId);
        if (currentCoinBalance < requiredCoin)
        {
            return StatusCode(402, new
            {
                error = new
                {
                    code = "INSUFFICIENT_ECOIN",
                    message = $"Không đủ ECoin để tạo quiz. Cần {requiredCoin} ECoin, hiện có {currentCoinBalance} ECoin.",
                    requiredCoin,
                    currentCoinBalance
                }
            });
        }

        if (files.Count > maxFiles)
            return BadRequest(new { error = new { code = "TOO_MANY_FILES", message = $"Chỉ cho phép tối đa {maxFiles} tệp." } });

        foreach (var file in files)
        {
            if (!allowedExtensions.Contains(Path.GetExtension(file.FileName).ToLowerInvariant()))
                return BadRequest(new { error = new { code = "INVALID_EXTENSION", message = $"Định dạng tệp không hợp lệ: {file.FileName}." } });
            if (file.Length > (long)maxFileSizeMb * 1024 * 1024)
                return BadRequest(new { error = new { code = "FILE_TOO_LARGE", message = $"Tệp quá lớn: {file.FileName}." } });
        }

        try
        {
            var attachments = new List<AttachmentInfo>();
            foreach (var f in files)
            {
                using var stream = f.OpenReadStream();
                var ext = Path.GetExtension(f.FileName).ToLowerInvariant();
                var content = await _fileParsingService.ExtractTextAsync(stream, ext);
                if (content.Length > maxInputCharacters)
                    return BadRequest(new { error = new { code = "INPUT_TOO_LONG", message = $"Nội dung từ {f.FileName} quá dài ({content.Length} ký tự)." } });
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

            // Deduct ECoin
            await _coinService.DeductCoinsAsync(userId, requiredCoin);

            // Generate unique slug
            var slug = await GenerateUniqueSlugAsync();

            // Create QuizGame and save questions
            var now = DateTime.UtcNow;
            var game = new QuizGame
            {
                UserId = userId,
                Title = request.Topic ?? "Bài quiz",
                Status = "draft",
                Slug = slug,
                ConfigJson = JsonSerializer.Serialize(new
                {
                    questionCount = request.QuestionCount,
                    topic = request.Topic,
                    difficulty = request.Difficulty,
                    language = request.Language,
                }),
                EcoinsSpent = requiredCoin,
                SourceDocumentContent = string.Join("\n\n", attachments.Select(a => a.Content)),
                SourceDocumentExpiresAt = now.AddHours(24),
                CreatedAt = now,
                UpdatedAt = now,
            };

            _context.QuizGames.Add(game);
            await _context.SaveChangesAsync();

            // Save questions
            var questionEntities = questions.Select((q, idx) => new QuizGameQuestion
            {
                QuizGameId = game.Id,
                Number = idx + 1,
                QuestionType = "multiple_choice",
                QuestionText = q.Question,
                OptionsJson = JsonSerializer.Serialize(q.Options.Select(o => o.Text).ToList()),
                CorrectAnswerIndex = q.CorrectAnswerIndex,
                Explanation = q.Explanation,
                Difficulty = request.Difficulty ?? "medium",
            }).ToList();

            _context.QuizGameQuestions.AddRange(questionEntities);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                gameId = game.Id,
                slug = game.Slug,
                questionCount = questionEntities.Count,
                warnings,
            });
        }
        catch (AIServiceException ex)
        {
            _logger.LogWarning(ex, "AIService failure during quiz generation");
            return StatusCode(502, new { error = new { code = "AI_ERROR", message = ex.Message } });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate quiz");
            return StatusCode(500, new { error = new { code = "INTERNAL_ERROR", message = "Không thể xử lý yêu cầu." } });
        }
    }

    private async Task<string> GenerateUniqueSlugAsync()
    {
        const string chars = "abcdefghijklmnopqrstuvwxyz0123456789";
        const int slugLength = 8;
        var random = new Random();

        for (int attempt = 0; attempt < 10; attempt++)
        {
            var slug = new string(Enumerable.Range(0, slugLength)
                .Select(_ => chars[random.Next(chars.Length)])
                .ToArray());
            var exists = await _context.QuizGames.AnyAsync(g => g.Slug == slug);
            if (!exists) return slug;
        }
        return $"{DateTime.UtcNow.Ticks:x}"[..slugLength];
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? throw new UnauthorizedAccessException("User ID not found in token.");
        return int.Parse(userIdClaim);
    }
}
