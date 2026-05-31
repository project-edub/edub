using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

public class LessonService : ILessonService
{
    private readonly ApplicationDbContext _context;
    private readonly IFileStorage _fileStorage;

    public LessonService(ApplicationDbContext context, IFileStorage fileStorage)
    {
        _context = context;
        _fileStorage = fileStorage;
    }

    public async Task<LessonDetailResponse> GetByIdAsync(int lessonId, int lecturerId)
    {
        var lesson = await GetLessonWithOwnershipCheck(lessonId, lecturerId);
        return MapToDetailResponse(lesson);
    }

    public async Task<LessonDetailResponse> UpdateNameAsync(int lessonId, int lecturerId, UpdateLessonNameRequest request)
    {
        var lesson = await GetLessonWithOwnershipCheck(lessonId, lecturerId);
        lesson.Name = request.Name;
        await _context.SaveChangesAsync();
        return MapToDetailResponse(lesson);
    }

    public async Task<DocumentResponse> AddDocumentAsync(int lessonId, int lecturerId, CreateDocumentRequest request)
    {
        await VerifyLessonOwnership(lessonId, lecturerId);

        var document = new LessonDocument
        {
            LessonId = lessonId,
            Name = request.Name,
            Link = request.Link,
            PageRange = request.PageRange
        };

        _context.LessonDocuments.Add(document);
        await _context.SaveChangesAsync();

        return MapToDocumentResponse(document);
    }

    public async Task<DocumentResponse> UpdateDocumentAsync(int documentId, int lecturerId, UpdateDocumentRequest request)
    {
        var document = await _context.LessonDocuments
            .Include(d => d.Lesson)
                .ThenInclude(l => l.LessonPlan)
            .FirstOrDefaultAsync(d => d.Id == documentId)
            ?? throw new LessonNotFoundException("Không tìm thấy tài liệu");

        if (document.Lesson.LessonPlan.LecturerId != lecturerId)
            throw new LessonNotFoundException("Không tìm thấy tài liệu");

        document.Name = request.Name;
        document.Link = request.Link;
        document.PageRange = request.PageRange;
        await _context.SaveChangesAsync();

        return MapToDocumentResponse(document);
    }

    public async Task DeleteDocumentAsync(int documentId, int lecturerId)
    {
        var document = await _context.LessonDocuments
            .Include(d => d.Lesson)
                .ThenInclude(l => l.LessonPlan)
            .FirstOrDefaultAsync(d => d.Id == documentId)
            ?? throw new LessonNotFoundException("Không tìm thấy tài liệu");

        if (document.Lesson.LessonPlan.LecturerId != lecturerId)
            throw new LessonNotFoundException("Không tìm thấy tài liệu");

        _context.LessonDocuments.Remove(document);
        await _context.SaveChangesAsync();
    }

    public async Task<AttachmentResponse> AddAttachmentAsync(int lessonId, int lecturerId, Stream fileStream, string fileName, long fileSize)
    {
        await VerifyLessonOwnership(lessonId, lecturerId);

        var fileReference = await _fileStorage.SaveFileAsync(fileStream, fileName, $"lecturers/{lecturerId}/lessons/{lessonId}", fileSize);

        var attachment = new LessonAttachment
        {
            LessonId = lessonId,
            FileName = fileName,
            FileReference = fileReference,
            FileSize = fileSize
        };

        _context.LessonAttachments.Add(attachment);
        await _context.SaveChangesAsync();

        return MapToAttachmentResponse(attachment);
    }

    public async Task<AttachmentResponse> AddAttachmentFromStorageAsync(int lessonId, int lecturerId, int storageItemId)
    {
        await VerifyLessonOwnership(lessonId, lecturerId);

        var storageItem = await _context.StorageItems
            .FirstOrDefaultAsync(si => si.Id == storageItemId && si.LecturerId == lecturerId)
            ?? throw new LessonNotFoundException("Không tìm thấy tệp trong kho lưu trữ");

        if (!string.Equals(storageItem.ItemType, "File", StringComparison.OrdinalIgnoreCase)
            || string.IsNullOrWhiteSpace(storageItem.FileReference))
        {
            throw new LessonNotFoundException("Mục đã chọn không phải là tệp hợp lệ");
        }

        var attachment = new LessonAttachment
        {
            LessonId = lessonId,
            FileName = storageItem.Name,
            FileReference = storageItem.FileReference,
            FileSize = storageItem.FileSize ?? 0
        };

        _context.LessonAttachments.Add(attachment);
        await _context.SaveChangesAsync();

        return MapToAttachmentResponse(attachment);
    }

    public async Task DeleteAttachmentAsync(int attachmentId, int lecturerId)
    {
        var attachment = await _context.LessonAttachments
            .Include(a => a.Lesson)
                .ThenInclude(l => l.LessonPlan)
            .FirstOrDefaultAsync(a => a.Id == attachmentId)
            ?? throw new LessonNotFoundException("Không tìm thấy tệp đính kèm");

        if (attachment.Lesson.LessonPlan.LecturerId != lecturerId)
            throw new LessonNotFoundException("Không tìm thấy tệp đính kèm");

        var hasOtherLessonReferences = await _context.LessonAttachments
            .AnyAsync(a => a.Id != attachment.Id && a.FileReference == attachment.FileReference);

        var hasStorageReferences = await _context.StorageItems
            .AnyAsync(s => s.FileReference == attachment.FileReference);

        if (!hasOtherLessonReferences && !hasStorageReferences)
        {
            await _fileStorage.DeleteFileAsync(attachment.FileReference);
        }

        _context.LessonAttachments.Remove(attachment);
        await _context.SaveChangesAsync();
    }

    private async Task<Lesson> GetLessonWithOwnershipCheck(int lessonId, int lecturerId)
    {
        var lesson = await _context.Lessons
            .Include(l => l.LessonPlan)
            .Include(l => l.Documents)
            .Include(l => l.Attachments)
            .Include(l => l.MiniGames)
            .FirstOrDefaultAsync(l => l.Id == lessonId)
            ?? throw new LessonNotFoundException("Không tìm thấy bài học");

        if (lesson.LessonPlan.LecturerId != lecturerId)
            throw new LessonNotFoundException("Không tìm thấy bài học");

        return lesson;
    }

    private async Task VerifyLessonOwnership(int lessonId, int lecturerId)
    {
        var lesson = await _context.Lessons
            .Include(l => l.LessonPlan)
            .FirstOrDefaultAsync(l => l.Id == lessonId)
            ?? throw new LessonNotFoundException("Không tìm thấy bài học");

        if (lesson.LessonPlan.LecturerId != lecturerId)
            throw new LessonNotFoundException("Không tìm thấy bài học");
    }

    private static LessonDetailResponse MapToDetailResponse(Lesson lesson)
    {
        return new LessonDetailResponse
        {
            Id = lesson.Id,
            Name = lesson.Name,
            OrderIndex = lesson.OrderIndex,
            ScheduledDate = lesson.ScheduledDate,
            Documents = lesson.Documents.Select(MapToDocumentResponse).ToList(),
            Attachments = lesson.Attachments.Select(MapToAttachmentResponse).ToList(),
            MiniGames = lesson.MiniGames.Select(mg => new MiniGameResponse
            {
                Id = mg.Id,
                Name = mg.Name,
                Description = mg.Description,
                Type = mg.Type,
                CreatedAt = mg.CreatedAt
            }).ToList()
        };
    }

    private static DocumentResponse MapToDocumentResponse(LessonDocument doc)
    {
        return new DocumentResponse
        {
            Id = doc.Id,
            Name = doc.Name,
            Link = doc.Link,
            PageRange = doc.PageRange
        };
    }

    private static AttachmentResponse MapToAttachmentResponse(LessonAttachment att)
    {
        return new AttachmentResponse
        {
            Id = att.Id,
            FileName = att.FileName,
            FileReference = att.FileReference,
            FileSize = att.FileSize
        };
    }
}

public class LessonNotFoundException : Exception
{
    public LessonNotFoundException(string message) : base(message) { }
}
