using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

public class CrosswordService : ICrosswordService
{
    private static readonly string[] AllowedExtensions = { ".docx", ".xlsx", ".pptx", ".pdf" };

    private readonly ApplicationDbContext _context;
    private readonly IFileParsingService _fileParsingService;
    private readonly IAIService _aiService;
    private readonly ICoinService _coinService;
    private readonly ILogger<CrosswordService> _logger;

    public CrosswordService(
        ApplicationDbContext context,
        IFileParsingService fileParsingService,
        IAIService aiService,
        ICoinService coinService,
        ILogger<CrosswordService> logger)
    {
        _context = context;
        _fileParsingService = fileParsingService;
        _aiService = aiService;
        _coinService = coinService;
        _logger = logger;
    }

    // ── 3.2 Upload & Extract ─────────────────────────────────────────────────

    public async Task<CrosswordUploadResponse> UploadAndExtractAsync(int userId, List<IFormFile> files)
    {
        if (files == null || files.Count == 0)
            throw new CrosswordValidationException("FILE_REQUIRED", "Vui lòng chọn ít nhất một tệp.");

        // Load subscription limits
        var subscription = await GetUserSubscriptionAsync(userId);
        var maxFiles = subscription?.MaxCrosswordFilesPerGeneration ?? 1;

        if (files.Count > maxFiles)
            throw new CrosswordValidationException("TOO_MANY_FILES",
                $"Gói đăng ký của bạn chỉ cho phép tối đa {maxFiles} tệp mỗi lần tạo ô chữ.");

        // Validate extensions
        foreach (var file in files)
        {
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!AllowedExtensions.Contains(ext))
                throw new CrosswordValidationException("INVALID_EXTENSION",
                    $"Định dạng tệp không hợp lệ: {file.FileName}. Hỗ trợ: {string.Join(", ", AllowedExtensions)}.");
        }

        // Extract text from each file
        var fileResults = new List<CrosswordFileExtractResult>();
        var allTexts = new List<string>();

        foreach (var file in files)
        {
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            string extractedText;
            try
            {
                using var stream = file.OpenReadStream();
                extractedText = await _fileParsingService.ExtractTextAsync(stream, ext);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to extract text from {FileName}", file.FileName);
                extractedText = string.Empty;
            }

            var quality = DetermineQuality(extractedText);
            fileResults.Add(new CrosswordFileExtractResult
            {
                FileName = file.FileName,
                Quality = quality,
                ExtractedText = extractedText
            });

            if (!string.IsNullOrWhiteSpace(extractedText))
                allTexts.Add(extractedText);
        }

        // Create a draft CrosswordGame to hold the extracted content
        var now = DateTime.UtcNow;
        var slug = await GenerateUniqueSlugAsync();
        var game = new CrosswordGame
        {
            UserId = userId,
            Title = string.Empty,
            Status = "draft",
            Slug = slug,
            SourceDocumentContent = string.Join("\n\n", allTexts),
            SourceDocumentExpiresAt = now.AddHours(24),
            CreatedAt = now,
            UpdatedAt = now
        };

        _context.CrosswordGames.Add(game);
        await _context.SaveChangesAsync();

        return new CrosswordUploadResponse
        {
            GameId = game.Id,
            Files = fileResults
        };
    }

    private static string DetermineQuality(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
            return "empty";

        if (text.Length < 100)
            return "poor";

        // Detect OCR issues: high ratio of special/non-alphanumeric chars or many very short words
        var words = text.Split(new[] { ' ', '\n', '\r', '\t' }, StringSplitOptions.RemoveEmptyEntries);
        if (words.Length == 0)
            return "poor";

        var shortWordRatio = (double)words.Count(w => w.Length <= 2) / words.Length;
        var specialCharCount = text.Count(c => !char.IsLetterOrDigit(c) && !char.IsWhiteSpace(c));
        var specialCharRatio = (double)specialCharCount / text.Length;

        if (shortWordRatio > 0.5 || specialCharRatio > 0.3)
            return "fair";

        return "good";
    }

    // ── 3.3 ECoin Estimation ─────────────────────────────────────────────────

    public async Task<CrosswordEstimateResponse> EstimateEcoinAsync(int userId, CrosswordEstimateRequest request)
    {
        var subscription = await GetUserSubscriptionAsync(userId);

        // Validate subscription limits
        var maxWords = subscription?.MaxCrosswordWordsPerGeneration ?? 10;
        var maxFiles = subscription?.MaxCrosswordFilesPerGeneration ?? 1;
        var maxGenerationsPerDay = subscription?.MaxCrosswordGenerationsPerDay ?? 1;

        if (request.WordCount > maxWords)
            throw new CrosswordValidationException("WORD_LIMIT_EXCEEDED",
                $"Gói đăng ký của bạn chỉ cho phép tối đa {maxWords} từ mỗi lần tạo ô chữ.");

        if (request.FileCount > maxFiles)
            throw new CrosswordValidationException("FILE_LIMIT_EXCEEDED",
                $"Gói đăng ký của bạn chỉ cho phép tối đa {maxFiles} tệp mỗi lần tạo ô chữ.");

        // Check daily generation count
        var todayStart = DateTime.UtcNow.Date;
        var todayCount = await _context.CrosswordEcoinTransactions
            .CountAsync(t => t.UserId == userId
                          && t.Action == "generate"
                          && t.CreatedAt >= todayStart);

        if (todayCount >= maxGenerationsPerDay)
            throw new CrosswordValidationException("DAILY_LIMIT_EXCEEDED",
                $"Bạn đã đạt giới hạn {maxGenerationsPerDay} lần tạo ô chữ trong ngày hôm nay.");

        // Calculate cost
        var (total, breakdown) = CalculateEcoinCost(request.WordCount, request.ClueStyle, request.Language);

        return new CrosswordEstimateResponse
        {
            EcoinsRequired = total,
            Breakdown = breakdown
        };
    }

    /// <summary>
    /// Calculates ECoin cost based on wordCount, clueStyle, and language.
    /// Formula from spec section 4.1.
    /// </summary>
    internal static (int total, CrosswordEstimateBreakdown breakdown) CalculateEcoinCost(
        int wordCount, string clueStyle, string language)
    {
        // Base cost by word count
        int baseCost = wordCount switch
        {
            >= 5 and <= 10 => 5,
            >= 11 and <= 15 => 8,
            >= 16 and <= 20 => 10,
            >= 21 and <= 25 => 12,
            >= 26 and <= 30 => 15,
            _ => 5 // default for out-of-range (< 5 treated as 5)
        };

        // ClueStyle modifier
        int clueModifier = clueStyle?.ToLowerInvariant() switch
        {
            "fill-in-blank" => 2,
            "multiple-choice" => 3,
            _ => 0 // "definition" or unknown
        };

        // Language modifier
        int langModifier = language?.ToLowerInvariant() switch
        {
            "vi" => 0,
            "en" => 0,
            _ => 2 // bilingual or unknown
        };

        var breakdown = new CrosswordEstimateBreakdown
        {
            BaseCost = baseCost,
            ClueStyleModifier = clueModifier,
            LanguageModifier = langModifier
        };

        return (baseCost + clueModifier + langModifier, breakdown);
    }

    // ── 3.4 Generate ─────────────────────────────────────────────────────────

    public async Task<CrosswordGenerateResponse> GenerateAsync(int userId, CrosswordGenerateRequest request)
    {
        // Load the draft game and verify ownership
        var game = await _context.CrosswordGames
            .FirstOrDefaultAsync(g => g.Id == request.GameId && g.UserId == userId);

        if (game == null)
            throw new CrosswordNotFoundException("Không tìm thấy trò chơi ô chữ.");

        // Check subscription limits
        var subscription = await GetUserSubscriptionAsync(userId);
        var maxWords = subscription?.MaxCrosswordWordsPerGeneration ?? 10;
        var maxGenerationsPerDay = subscription?.MaxCrosswordGenerationsPerDay ?? 1;

        if (request.Config.WordCount > maxWords)
            throw new CrosswordValidationException("WORD_LIMIT_EXCEEDED",
                $"Gói đăng ký của bạn chỉ cho phép tối đa {maxWords} từ mỗi lần tạo ô chữ.");

        // Check daily generation limit
        var todayStart = DateTime.UtcNow.Date;
        var todayCount = await _context.CrosswordEcoinTransactions
            .CountAsync(t => t.UserId == userId
                          && t.Action == "generate"
                          && t.CreatedAt >= todayStart);

        if (todayCount >= maxGenerationsPerDay)
            throw new CrosswordValidationException("DAILY_LIMIT_EXCEEDED",
                $"Bạn đã đạt giới hạn {maxGenerationsPerDay} lần tạo ô chữ trong ngày hôm nay.");

        // Calculate cost and check ECoin balance
        var (ecoinsRequired, _) = CalculateEcoinCost(
            request.Config.WordCount, request.Config.ClueStyle, request.Config.Language);

        var balance = await _coinService.GetBalanceAsync(userId);
        if (balance < ecoinsRequired)
            throw new CrosswordInsufficientEcoinException(
                $"Không đủ ECoin để tạo ô chữ. Cần {ecoinsRequired} ECoin, hiện có {balance} ECoin.",
                ecoinsRequired, balance);

        // Build attachment from stored source content
        var attachments = new List<AttachmentInfo>();
        if (!string.IsNullOrWhiteSpace(game.SourceDocumentContent))
        {
            attachments.Add(new AttachmentInfo
            {
                FileName = "source_document.txt",
                Content = game.SourceDocumentContent
            });
        }

        // Call AI service — do NOT deduct ECoin before this
        CrosswordAIResult aiResult;
        try
        {
            aiResult = await _aiService.GenerateCrosswordAsync(attachments, request.Config);
        }
        catch (AIServiceException)
        {
            // Do NOT deduct ECoin on AI failure
            throw;
        }

        // Generate unique slug
        var slug = await GenerateUniqueSlugAsync();

        // Update game record
        var now = DateTime.UtcNow;
        game.Title = request.Title;
        game.ConfigJson = JsonSerializer.Serialize(request.Config);
        game.EcoinsSpent = ecoinsRequired;
        game.Slug = slug;
        game.UpdatedAt = now;

        // Remove any existing words (in case of re-use of draft)
        var existingWords = await _context.CrosswordWords
            .Where(w => w.GameId == game.Id)
            .ToListAsync();
        _context.CrosswordWords.RemoveRange(existingWords);

        // Create CrosswordWord records
        var wordEntities = aiResult.Words.Select(w => new CrosswordWord
        {
            GameId = game.Id,
            Word = w.Word,
            DisplayWord = w.DisplayWord,
            Clue = w.Clue,
            Direction = "across", // default; client will set actual direction after grid build
            StartRow = 0,
            StartCol = 0,
            Number = 0,
            Difficulty = w.Difficulty,
            SourceContext = w.SourceContext
        }).ToList();

        _context.CrosswordWords.AddRange(wordEntities);

        // Deduct ECoin and record transaction atomically
        await _coinService.DeductCoinsAsync(userId, ecoinsRequired);

        _context.CrosswordEcoinTransactions.Add(new CrosswordEcoinTransaction
        {
            UserId = userId,
            GameId = game.Id,
            EcoinsSpent = ecoinsRequired,
            Action = "generate",
            CreatedAt = now
        });

        await _context.SaveChangesAsync();

        return new CrosswordGenerateResponse
        {
            GameId = game.Id,
            Slug = slug,
            Words = aiResult.Words
        };
    }

    // ── 3.5 Regenerate ───────────────────────────────────────────────────────

    public async Task<CrosswordGenerateResponse> RegenerateAsync(int userId, int gameId, CrosswordGenerationConfig config)
    {
        var game = await _context.CrosswordGames
            .FirstOrDefaultAsync(g => g.Id == gameId && g.UserId == userId);

        if (game == null)
            throw new CrosswordNotFoundException("Không tìm thấy trò chơi ô chữ.");

        // Verify source document is still available (FR-11)
        if (string.IsNullOrWhiteSpace(game.SourceDocumentContent))
            throw new CrosswordValidationException("SOURCE_EXPIRED",
                "Nội dung tài liệu nguồn đã bị xóa. Vui lòng tải lên tài liệu mới.");

        if (game.SourceDocumentExpiresAt.HasValue && game.SourceDocumentExpiresAt.Value <= DateTime.UtcNow)
            throw new CrosswordValidationException("SOURCE_EXPIRED",
                "Nội dung tài liệu nguồn đã hết hạn (24 giờ). Vui lòng tải lên tài liệu mới.");

        // Calculate regenerate cost = ceil(generateCost * 0.5)
        var (generateCost, _) = CalculateEcoinCost(config.WordCount, config.ClueStyle, config.Language);
        var regenerateCost = (int)Math.Ceiling(generateCost * 0.5);

        // Check ECoin balance
        var balance = await _coinService.GetBalanceAsync(userId);
        if (balance < regenerateCost)
            throw new CrosswordInsufficientEcoinException(
                $"Không đủ ECoin để tạo lại ô chữ. Cần {regenerateCost} ECoin, hiện có {balance} ECoin.",
                regenerateCost, balance);

        // Build attachment from stored source content
        var attachments = new List<AttachmentInfo>
        {
            new AttachmentInfo
            {
                FileName = "source_document.txt",
                Content = game.SourceDocumentContent
            }
        };

        // Call AI service
        CrosswordAIResult aiResult;
        try
        {
            aiResult = await _aiService.GenerateCrosswordAsync(attachments, config);
        }
        catch (AIServiceException)
        {
            throw;
        }

        var now = DateTime.UtcNow;

        // Delete old words and create new ones
        var oldWords = await _context.CrosswordWords
            .Where(w => w.GameId == gameId)
            .ToListAsync();
        _context.CrosswordWords.RemoveRange(oldWords);

        var newWords = aiResult.Words.Select(w => new CrosswordWord
        {
            GameId = gameId,
            Word = w.Word,
            DisplayWord = w.DisplayWord,
            Clue = w.Clue,
            Direction = "across",
            StartRow = 0,
            StartCol = 0,
            Number = 0,
            Difficulty = w.Difficulty,
            SourceContext = w.SourceContext
        }).ToList();

        _context.CrosswordWords.AddRange(newWords);

        // Update game
        game.ConfigJson = JsonSerializer.Serialize(config);
        game.EcoinsSpent += regenerateCost;
        game.UpdatedAt = now;

        // Deduct ECoin and record transaction
        await _coinService.DeductCoinsAsync(userId, regenerateCost);

        _context.CrosswordEcoinTransactions.Add(new CrosswordEcoinTransaction
        {
            UserId = userId,
            GameId = gameId,
            EcoinsSpent = regenerateCost,
            Action = "regenerate",
            CreatedAt = now
        });

        await _context.SaveChangesAsync();

        return new CrosswordGenerateResponse
        {
            GameId = gameId,
            Slug = game.Slug,
            Words = aiResult.Words
        };
    }

    // ── 3.5 CRUD ─────────────────────────────────────────────────────────────

    public async Task<CrosswordGameDto> GetByIdAsync(int userId, int gameId)
    {
        var game = await _context.CrosswordGames
            .Include(g => g.Words)
            .FirstOrDefaultAsync(g => g.Id == gameId && g.UserId == userId);

        if (game == null)
            throw new CrosswordNotFoundException("Không tìm thấy trò chơi ô chữ.");

        return MapToGameDto(game);
    }

    public async Task UpdateAsync(int userId, int gameId, CrosswordGameDto dto)
    {
        var game = await _context.CrosswordGames
            .Include(g => g.Words)
            .FirstOrDefaultAsync(g => g.Id == gameId && g.UserId == userId);

        if (game == null)
            throw new CrosswordNotFoundException("Không tìm thấy trò chơi ô chữ.");

        // Only update fields that were actually provided (non-empty)
        if (!string.IsNullOrEmpty(dto.Title))
            game.Title = dto.Title;

        if (!string.IsNullOrEmpty(dto.ConfigJson))
            game.ConfigJson = dto.ConfigJson;

        if (!string.IsNullOrEmpty(dto.GridJson))
            game.GridJson = dto.GridJson;

        game.UpdatedAt = DateTime.UtcNow;

        // Update deadline if provided in the DTO
        game.Deadline = dto.Deadline?.ToUniversalTime();

        // Update word positions if provided, and remove words not in the list
        if (dto.Words != null && dto.Words.Count > 0)
        {
            var wordIdsInPayload = dto.Words.Select(w => w.Id).ToHashSet();

            // Remove words not in the payload (unplaced words)
            var wordsToRemove = game.Words.Where(w => !wordIdsInPayload.Contains(w.Id)).ToList();
            if (wordsToRemove.Count > 0)
            {
                _context.CrosswordWords.RemoveRange(wordsToRemove);
            }

            foreach (var wordDto in dto.Words)
            {
                var word = game.Words.FirstOrDefault(w => w.Id == wordDto.Id);
                if (word != null)
                {
                    word.Direction = wordDto.Direction;
                    word.StartRow = wordDto.StartRow;
                    word.StartCol = wordDto.StartCol;
                    word.Number = wordDto.Number;
                }
            }
        }

        await _context.SaveChangesAsync();
    }

    public async Task UpdateWordAsync(int userId, int gameId, int wordId, CrosswordWordUpdateRequest request)
    {
        // Verify game ownership
        var game = await _context.CrosswordGames
            .FirstOrDefaultAsync(g => g.Id == gameId && g.UserId == userId);

        if (game == null)
            throw new CrosswordNotFoundException("Không tìm thấy trò chơi ô chữ.");

        var word = await _context.CrosswordWords
            .FirstOrDefaultAsync(w => w.Id == wordId && w.GameId == gameId);

        if (word == null)
            throw new CrosswordNotFoundException("Không tìm thấy từ trong ô chữ.");

        word.Word = request.Word;
        word.Clue = request.Clue;
        word.Direction = request.Direction;
        word.StartRow = request.StartRow;
        word.StartCol = request.StartCol;
        word.Number = request.Number;

        game.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }

    // ── 3.5 Publish ──────────────────────────────────────────────────────────

    public async Task PublishAsync(int userId, int gameId, CrosswordPublishRequest request)
    {
        var game = await _context.CrosswordGames
            .Include(g => g.Words)
            .FirstOrDefaultAsync(g => g.Id == gameId && g.UserId == userId);

        if (game == null)
            throw new CrosswordNotFoundException("Không tìm thấy trò chơi ô chữ.");

        if (!game.Words.Any())
            throw new CrosswordValidationException("NO_WORDS",
                "Trò chơi ô chữ phải có ít nhất một từ trước khi xuất bản.");

        if (string.IsNullOrWhiteSpace(request.GridJson))
            throw new CrosswordValidationException("EMPTY_GRID",
                "Lưới ô chữ không được để trống khi xuất bản.");

        var now = DateTime.UtcNow;
        game.Status = "published";
        game.PublishedAt = now;
        game.ShowAnswerAfterExpiry = true; // Always show answers after max attempts
        game.MaxAttempts = request.MaxAttempts;
        game.GridJson = request.GridJson;
        game.UpdatedAt = now;

        // Handle deadline: null = permanent (no expiry)
        if (!string.IsNullOrWhiteSpace(request.Deadline))
        {
            if (DateTime.TryParse(request.Deadline, out var deadline))
                game.Deadline = deadline.ToUniversalTime();
        }
        else
        {
            game.Deadline = null; // Permanent / no expiry
        }

        await _context.SaveChangesAsync();
    }

    // ── 3.5 Player ───────────────────────────────────────────────────────────

    public async Task<CrosswordPlayerDto> GetForPlayerAsync(string slug)
    {
        var game = await _context.CrosswordGames
            .Include(g => g.Words)
            .FirstOrDefaultAsync(g => g.Slug == slug && g.Status == "published");

        if (game == null)
            throw new CrosswordNotFoundException("Không tìm thấy trò chơi ô chữ.");

        var now = DateTime.UtcNow;
        var isExpired = game.Deadline.HasValue && now > game.Deadline.Value;

        // If expired and answers should not be shown, return expired state with no words
        if (isExpired && !game.ShowAnswerAfterExpiry)
        {
            return new CrosswordPlayerDto
            {
                Slug = game.Slug,
                Title = game.Title,
                GridJson = game.GridJson,
                Deadline = game.Deadline,
                MaxAttempts = game.MaxAttempts,
                ShowAnswerAfterExpiry = game.ShowAnswerAfterExpiry,
                IsExpired = true,
                Words = new List<CrosswordPlayerWordDto>()
            };
        }

        // Map words — hide the actual answer (Word field)
        var playerWords = game.Words.Select(w => new CrosswordPlayerWordDto
        {
            Id = w.Id,
            DisplayWord = new string('_', w.Word.Length), // mask the answer
            Clue = w.Clue,
            Direction = w.Direction,
            StartRow = w.StartRow,
            StartCol = w.StartCol,
            Number = w.Number,
            WordLength = w.Word.Length
        }).ToList();

        return new CrosswordPlayerDto
        {
            Slug = game.Slug,
            Title = game.Title,
            GridJson = game.GridJson,
            Deadline = game.Deadline,
            MaxAttempts = game.MaxAttempts,
            ShowAnswerAfterExpiry = game.ShowAnswerAfterExpiry,
            IsExpired = isExpired,
            Words = playerWords
        };
    }

    // ── 3.5 List ─────────────────────────────────────────────────────────────

    public async Task<List<CrosswordListItemDto>> GetListAsync(int userId)
    {
        var games = await _context.CrosswordGames
            .Where(g => g.UserId == userId)
            .OrderByDescending(g => g.CreatedAt)
            .Select(g => new CrosswordListItemDto
            {
                Id = g.Id,
                Title = g.Title,
                Status = g.Status,
                CreatedAt = g.CreatedAt,
                WordCount = g.Words.Count,
                EcoinsSpent = g.EcoinsSpent,
                Slug = g.Slug
            })
            .ToListAsync();

        return games;
    }

    // ── 3.5 Delete ───────────────────────────────────────────────────────────

    public async Task DeleteAsync(int userId, int gameId)
    {
        var game = await _context.CrosswordGames
            .Include(g => g.Words)
            .FirstOrDefaultAsync(g => g.Id == gameId && g.UserId == userId);

        if (game == null)
            throw new CrosswordNotFoundException("Không tìm thấy trò chơi ô chữ.");

        // Delete related ECoin transactions first (FK constraint)
        var transactions = await _context.CrosswordEcoinTransactions
            .Where(t => t.GameId == gameId)
            .ToListAsync();
        if (transactions.Count > 0)
            _context.CrosswordEcoinTransactions.RemoveRange(transactions);

        _context.CrosswordGames.Remove(game);
        await _context.SaveChangesAsync();
    }

    // ── 3.5 Export PDF (stub) ─────────────────────────────────────────────────

    public Task ExportPdfAsync(int userId, int gameId)
    {
        throw new NotImplementedException("PDF export is not yet implemented.");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<SubscriptionPackage?> GetUserSubscriptionAsync(int userId)
    {
        var user = await _context.Users
            .Include(u => u.SubscriptionPackage)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId);

        return user?.SubscriptionPackage;
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

            var exists = await _context.CrosswordGames.AnyAsync(g => g.Slug == slug);
            if (!exists)
                return slug;
        }

        // Fallback: use timestamp-based slug
        return $"{DateTime.UtcNow.Ticks:x}"[..slugLength];
    }

    private static CrosswordGameDto MapToGameDto(CrosswordGame game)
    {
        return new CrosswordGameDto
        {
            Id = game.Id,
            Title = game.Title,
            Status = game.Status,
            Slug = game.Slug,
            ConfigJson = game.ConfigJson,
            GridJson = game.GridJson,
            EcoinsSpent = game.EcoinsSpent,
            Deadline = game.Deadline,
            ShowAnswerAfterExpiry = game.ShowAnswerAfterExpiry,
            MaxAttempts = game.MaxAttempts,
            CreatedAt = game.CreatedAt,
            UpdatedAt = game.UpdatedAt,
            PublishedAt = game.PublishedAt,
            Words = game.Words.Select(w => new CrosswordWordDetailDto
            {
                Id = w.Id,
                Word = w.Word,
                DisplayWord = w.DisplayWord,
                Clue = w.Clue,
                Direction = w.Direction,
                StartRow = w.StartRow,
                StartCol = w.StartCol,
                Number = w.Number,
                Difficulty = w.Difficulty,
                SourceContext = w.SourceContext
            }).ToList()
        };
    }
}

// ── Custom exceptions ─────────────────────────────────────────────────────────

public class CrosswordValidationException : Exception
{
    public string Code { get; }

    public CrosswordValidationException(string code, string message) : base(message)
    {
        Code = code;
    }
}

public class CrosswordNotFoundException : Exception
{
    public CrosswordNotFoundException(string message) : base(message) { }
}

public class CrosswordInsufficientEcoinException : Exception
{
    public int Required { get; }
    public int Current { get; }

    public CrosswordInsufficientEcoinException(string message, int required, int current)
        : base(message)
    {
        Required = required;
        Current = current;
    }
}
