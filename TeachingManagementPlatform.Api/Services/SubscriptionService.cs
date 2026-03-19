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
        Validate(request.Price, request.StorageLimitBytes);

        var package = new SubscriptionPackage
        {
            Name = request.Name,
            Price = request.Price,
            StorageLimitBytes = request.StorageLimitBytes,
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
        Validate(price, storageLimit);

        if (request.Name != null)
            package.Name = request.Name;

        if (request.Price.HasValue)
            package.Price = request.Price.Value;

        if (request.StorageLimitBytes.HasValue)
            package.StorageLimitBytes = request.StorageLimitBytes.Value;

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

    private static void Validate(decimal price, long storageLimitBytes)
    {
        var errors = new List<string>();

        if (price < 0)
            errors.Add("Giá phải là số không âm");

        if (storageLimitBytes <= 0)
            errors.Add("Giới hạn lưu trữ phải là số dương");

        if (errors.Count > 0)
            throw new ValidationException(errors);
    }

    private static SubscriptionPackageResponse MapToResponse(SubscriptionPackage package)
    {
        return new SubscriptionPackageResponse
        {
            Id = package.Id,
            Name = package.Name,
            Price = package.Price,
            StorageLimitBytes = package.StorageLimitBytes,
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
