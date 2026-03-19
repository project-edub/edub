using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

public class MiniGameService : IMiniGameService
{
    private readonly ApplicationDbContext _context;
    private readonly IAIService _aiService;
    private readonly IFileStorage _fileStorage;

    public MiniGameService(ApplicationDbContext context, IAIService aiService, IFileStorage fileStorage)
    {
        _context = context;
        _aiService = aiService;
        _fileStorage = fileStorage;
    }

    public async Task<MiniGameDetailResponse> CreateAsync(int lessonId, int lecturerId, CreateMiniGameRequest request)
    {
        var lesson = await _context.Lessons
            .Include(l => l.LessonPlan)
            .Include(l => l.Documents)
            .Include(l => l.Attachments)
            .FirstOrDefaultAsync(l => l.Id == lessonId)
            ?? throw new MiniGameNotFoundException("Không tìm thấy bài học");

        if (lesson.LessonPlan.LecturerId != lecturerId)
            throw new MiniGameNotFoundException("Không tìm thấy bài học");

        var documents = lesson.Documents.Select(d => new DocumentInfo
        {
            Name = d.Name,
            Link = d.Link,
            PageRange = d.PageRange
        }).ToList();

        var attachments = new List<AttachmentInfo>();
        foreach (var att in lesson.Attachments)
        {
            try
            {
                using var stream = await _fileStorage.GetFileAsync(att.FileReference);
                using var reader = new StreamReader(stream);
                var content = await reader.ReadToEndAsync();
                attachments.Add(new AttachmentInfo
                {
                    FileName = att.FileName,
                    Content = content
                });
            }
            catch
            {
                // Skip unreadable attachments
            }
        }

        var quizContent = await _aiService.GenerateQuizAsync(documents, attachments);

        var contentJson = JsonSerializer.Serialize(quizContent, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        var miniGame = new MiniGame
        {
            LessonId = lessonId,
            Name = request.Name,
            Description = request.Description,
            Type = request.GameType,
            Content = JsonDocument.Parse(contentJson),
            CreatedAt = DateTime.UtcNow
        };

        _context.MiniGames.Add(miniGame);
        await _context.SaveChangesAsync();

        return MapToDetailResponse(miniGame);
    }

    public async Task<MiniGameDetailResponse> GetByIdAsync(int id, int lecturerId)
    {
        var miniGame = await GetMiniGameWithOwnershipCheck(id, lecturerId);
        return MapToDetailResponse(miniGame);
    }

    public async Task<MiniGamePlayResponse> GetPlayDataAsync(int id, int lecturerId)
    {
        var miniGame = await GetMiniGameWithOwnershipCheck(id, lecturerId);
        return new MiniGamePlayResponse
        {
            Id = miniGame.Id,
            Name = miniGame.Name,
            Type = miniGame.Type,
            Content = miniGame.Content
        };
    }

    public async Task DeleteAsync(int id, int lecturerId)
    {
        var miniGame = await GetMiniGameWithOwnershipCheck(id, lecturerId);
        _context.MiniGames.Remove(miniGame);
        await _context.SaveChangesAsync();
    }

    private async Task<MiniGame> GetMiniGameWithOwnershipCheck(int id, int lecturerId)
    {
        var miniGame = await _context.MiniGames
            .Include(mg => mg.Lesson)
                .ThenInclude(l => l.LessonPlan)
            .FirstOrDefaultAsync(mg => mg.Id == id)
            ?? throw new MiniGameNotFoundException("Không tìm thấy mini game");

        if (miniGame.Lesson.LessonPlan.LecturerId != lecturerId)
            throw new MiniGameNotFoundException("Không tìm thấy mini game");

        return miniGame;
    }

    private static MiniGameDetailResponse MapToDetailResponse(MiniGame miniGame)
    {
        return new MiniGameDetailResponse
        {
            Id = miniGame.Id,
            Name = miniGame.Name,
            Description = miniGame.Description,
            Type = miniGame.Type,
            Content = miniGame.Content,
            CreatedAt = miniGame.CreatedAt
        };
    }
}

public class MiniGameNotFoundException : Exception
{
    public MiniGameNotFoundException(string message) : base(message) { }
}
