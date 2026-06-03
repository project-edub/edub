using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

public class SubscriptionService : ISubscriptionService
{
    private readonly ApplicationDbContext _context;

    public SubscriptionService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<SubscriptionPackageResponse>> GetAllAsync()
    {
        return await _context.SubscriptionPackages
            .Select(sp => MapToResponse(sp))
            .ToListAsync();
    }

    public async Task<SubscriptionPackageResponse> GetByIdAsync(int id)
    {
        var package = await _context.SubscriptionPackages.FindAsync(id);
        if (package == null)
            throw new SubscriptionPackageNotFoundException("Không tìm thấy gói đăng ký");

        return MapToResponse(package);
    }

    public async Task<SubscriptionPackageResponse> CreateAsync(CreateSubscriptionPackageRequest request)
    {
        Validate(
            request.Price,
            request.StorageLimitBytes,
            request.MaxFilesPerQuizGeneration,
            request.MaxQuestionsPerQuiz);

        if (request.IsDefault)
        {
            await ClearDefaultFlagAsync();
        }

        var package = new SubscriptionPackage
        {
            Name = request.Name,
            Price = request.Price,
            StorageLimitBytes = request.StorageLimitBytes,
            MaxFilesPerQuizGeneration = request.MaxFilesPerQuizGeneration,
            MaxQuestionsPerQuiz = request.MaxQuestionsPerQuiz,
            MaxCrosswordFilesPerGeneration = request.MaxCrosswordFilesPerGeneration,
            MaxCrosswordWordsPerGeneration = request.MaxCrosswordWordsPerGeneration,
            MaxCrosswordGenerationsPerDay = request.MaxCrosswordGenerationsPerDay,
            IsDefault = request.IsDefault,
            IsActive = request.IsActive,
            UnlockedFeatures = request.UnlockedFeatures ?? new List<string>(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.SubscriptionPackages.Add(package);
        await _context.SaveChangesAsync();

        return MapToResponse(package);
    }

    public async Task<SubscriptionPackageResponse> UpdateAsync(int id, UpdateSubscriptionPackageRequest request)
    {
        var package = await _context.SubscriptionPackages.FindAsync(id);
        if (package == null)
            throw new SubscriptionPackageNotFoundException("Không tìm thấy gói đăng ký");

        var price = request.Price ?? package.Price;
        var storageLimit = request.StorageLimitBytes ?? package.StorageLimitBytes;
        var maxFiles = request.MaxFilesPerQuizGeneration ?? package.MaxFilesPerQuizGeneration;
        var maxQuestions = request.MaxQuestionsPerQuiz ?? package.MaxQuestionsPerQuiz;
        Validate(price, storageLimit, maxFiles, maxQuestions);

        if (request.Name != null)
            package.Name = request.Name;

        if (request.Price.HasValue)
            package.Price = request.Price.Value;

        if (request.StorageLimitBytes.HasValue)
            package.StorageLimitBytes = request.StorageLimitBytes.Value;

        if (request.MaxFilesPerQuizGeneration.HasValue)
            package.MaxFilesPerQuizGeneration = request.MaxFilesPerQuizGeneration.Value;

        if (request.MaxQuestionsPerQuiz.HasValue)
            package.MaxQuestionsPerQuiz = request.MaxQuestionsPerQuiz.Value;

        if (request.MaxCrosswordFilesPerGeneration.HasValue)
            package.MaxCrosswordFilesPerGeneration = request.MaxCrosswordFilesPerGeneration.Value;

        if (request.MaxCrosswordWordsPerGeneration.HasValue)
            package.MaxCrosswordWordsPerGeneration = request.MaxCrosswordWordsPerGeneration.Value;

        if (request.MaxCrosswordGenerationsPerDay.HasValue)
            package.MaxCrosswordGenerationsPerDay = request.MaxCrosswordGenerationsPerDay.Value;

        if (request.IsActive.HasValue)
            package.IsActive = request.IsActive.Value;

        if (request.IsDefault.HasValue)
        {
            package.IsDefault = request.IsDefault.Value;
            if (package.IsDefault)
                await ClearDefaultFlagAsync(package.Id);
        }

        if (request.UnlockedFeatures != null)
            package.UnlockedFeatures = request.UnlockedFeatures;

        package.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return MapToResponse(package);
    }

    public async Task DeleteAsync(int id)
    {
        var package = await _context.SubscriptionPackages.FindAsync(id);
        if (package == null)
            throw new SubscriptionPackageNotFoundException("Không tìm thấy gói đăng ký");

        _context.SubscriptionPackages.Remove(package);
        await _context.SaveChangesAsync();
    }

    private static void Validate(decimal price, long storageLimitBytes, int maxFilesPerQuizGeneration, int maxQuestionsPerQuiz)
    {
        var errors = new List<string>();

        if (price < 0)
            errors.Add("Giá phải là số không âm");

        if (storageLimitBytes <= 0)
            errors.Add("Giới hạn lưu trữ phải là số dương");

        if (maxFilesPerQuizGeneration <= 0)
            errors.Add("Số file mỗi lần tạo quiz phải lớn hơn 0");

        if (maxQuestionsPerQuiz <= 0)
            errors.Add("Số câu hỏi tối đa phải lớn hơn 0");

        if (errors.Count > 0)
            throw new ValidationException(errors);
    }

    private async Task ClearDefaultFlagAsync(int? exceptId = null)
    {
        var defaultPackages = await _context.SubscriptionPackages
            .Where(sp => exceptId == null || sp.Id != exceptId.Value)
            .Where(sp => sp.IsDefault)
            .ToListAsync();

        if (defaultPackages.Count == 0)
            return;

        foreach (var defaultPackage in defaultPackages)
        {
            defaultPackage.IsDefault = false;
            defaultPackage.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
    }

    private static SubscriptionPackageResponse MapToResponse(SubscriptionPackage package)
    {
        return new SubscriptionPackageResponse
        {
            Id = package.Id,
            Name = package.Name,
            Price = package.Price,
            StorageLimitBytes = package.StorageLimitBytes,
            MaxFilesPerQuizGeneration = package.MaxFilesPerQuizGeneration,
            MaxQuestionsPerQuiz = package.MaxQuestionsPerQuiz,
            MaxCrosswordFilesPerGeneration = package.MaxCrosswordFilesPerGeneration,
            MaxCrosswordWordsPerGeneration = package.MaxCrosswordWordsPerGeneration,
            MaxCrosswordGenerationsPerDay = package.MaxCrosswordGenerationsPerDay,
            IsDefault = package.IsDefault,
            IsActive = package.IsActive,
            UnlockedFeatures = package.UnlockedFeatures,
            CreatedAt = package.CreatedAt,
            UpdatedAt = package.UpdatedAt
        };
    }
}

public class SubscriptionPackageNotFoundException : Exception
{
    public SubscriptionPackageNotFoundException(string message) : base(message) { }
}

public class ValidationException : Exception
{
    public List<string> Errors { get; }

    public ValidationException(List<string> errors)
        : base(string.Join("; ", errors))
    {
        Errors = errors;
    }
}
