using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Tests.Services;

public class SubscriptionServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly SubscriptionService _service;

    public SubscriptionServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"SubscriptionTest_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _service = new SubscriptionService(_context);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    // --- GetAllAsync ---

    [Fact]
    public async Task GetAllAsync_ReturnsAllPackages()
    {
        _context.SubscriptionPackages.AddRange(
            new SubscriptionPackage { Name = "Basic", Price = 100_000m, StorageLimitBytes = 1_000_000, UnlockedFeatures = new List<string> { "feature1" }, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new SubscriptionPackage { Name = "Pro", Price = 200_000m, StorageLimitBytes = 5_000_000, UnlockedFeatures = new List<string> { "feature1", "feature2" }, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();

        var result = await _service.GetAllAsync();

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetAllAsync_ReturnsEmptyList_WhenNoPackages()
    {
        var result = await _service.GetAllAsync();
        Assert.Empty(result);
    }

    // --- GetByIdAsync ---

    [Fact]
    public async Task GetByIdAsync_ReturnsPackage_WhenExists()
    {
        var package = new SubscriptionPackage { Name = "Basic", Price = 50_000m, StorageLimitBytes = 1_000_000, UnlockedFeatures = new List<string> { "storage" }, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.SubscriptionPackages.Add(package);
        await _context.SaveChangesAsync();

        var result = await _service.GetByIdAsync(package.Id);

        Assert.Equal("Basic", result.Name);
        Assert.Equal(50_000m, result.Price);
        Assert.Equal(1_000_000, result.StorageLimitBytes);
        Assert.Single(result.UnlockedFeatures);
    }

    [Fact]
    public async Task GetByIdAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<SubscriptionPackageNotFoundException>(() => _service.GetByIdAsync(999));
    }

    // --- CreateAsync ---

    [Fact]
    public async Task CreateAsync_CreatesPackage_WithValidData()
    {
        var request = new CreateSubscriptionPackageRequest
        {
            Name = "Premium",
            Price = 300_000m,
            StorageLimitBytes = 10_000_000,
            UnlockedFeatures = new List<string> { "ai_mini_games", "excel_export" }
        };

        var result = await _service.CreateAsync(request);

        Assert.Equal("Premium", result.Name);
        Assert.Equal(300_000m, result.Price);
        Assert.Equal(10_000_000, result.StorageLimitBytes);
        Assert.Equal(2, result.UnlockedFeatures.Count);
        Assert.True(result.Id > 0);
    }

    [Fact]
    public async Task CreateAsync_AllowsZeroPrice()
    {
        var request = new CreateSubscriptionPackageRequest
        {
            Name = "Free",
            Price = 0m,
            StorageLimitBytes = 500_000,
            UnlockedFeatures = new List<string>()
        };

        var result = await _service.CreateAsync(request);

        Assert.Equal(0m, result.Price);
    }

    [Fact]
    public async Task CreateAsync_ThrowsValidation_WhenNegativePrice()
    {
        var request = new CreateSubscriptionPackageRequest
        {
            Name = "Invalid",
            Price = -1m,
            StorageLimitBytes = 1_000_000
        };

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(request));
        Assert.Contains("Giá phải là số không âm", ex.Errors);
    }

    [Fact]
    public async Task CreateAsync_ThrowsValidation_WhenZeroStorageLimit()
    {
        var request = new CreateSubscriptionPackageRequest
        {
            Name = "Invalid",
            Price = 100m,
            StorageLimitBytes = 0
        };

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(request));
        Assert.Contains("Giới hạn lưu trữ phải là số dương", ex.Errors);
    }

    [Fact]
    public async Task CreateAsync_ThrowsValidation_WhenNegativeStorageLimit()
    {
        var request = new CreateSubscriptionPackageRequest
        {
            Name = "Invalid",
            Price = 100m,
            StorageLimitBytes = -500
        };

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(request));
        Assert.Contains("Giới hạn lưu trữ phải là số dương", ex.Errors);
    }

    [Fact]
    public async Task CreateAsync_ThrowsValidation_WithMultipleErrors()
    {
        var request = new CreateSubscriptionPackageRequest
        {
            Name = "Invalid",
            Price = -10m,
            StorageLimitBytes = 0
        };

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _service.CreateAsync(request));
        Assert.Equal(2, ex.Errors.Count);
    }

    [Fact]
    public async Task CreateAsync_PackageAppearsInGetAll()
    {
        var request = new CreateSubscriptionPackageRequest
        {
            Name = "Listed",
            Price = 100m,
            StorageLimitBytes = 1_000
        };
        await _service.CreateAsync(request);

        var all = await _service.GetAllAsync();
        Assert.Single(all);
        Assert.Equal("Listed", all[0].Name);
    }

    // --- UpdateAsync ---

    [Fact]
    public async Task UpdateAsync_UpdatesName()
    {
        var package = new SubscriptionPackage { Name = "Old", Price = 100m, StorageLimitBytes = 1000, UnlockedFeatures = new(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.SubscriptionPackages.Add(package);
        await _context.SaveChangesAsync();

        var result = await _service.UpdateAsync(package.Id, new UpdateSubscriptionPackageRequest { Name = "New" });

        Assert.Equal("New", result.Name);
    }

    [Fact]
    public async Task UpdateAsync_UpdatesPrice()
    {
        var package = new SubscriptionPackage { Name = "Pkg", Price = 100m, StorageLimitBytes = 1000, UnlockedFeatures = new(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.SubscriptionPackages.Add(package);
        await _context.SaveChangesAsync();

        var result = await _service.UpdateAsync(package.Id, new UpdateSubscriptionPackageRequest { Price = 200m });

        Assert.Equal(200m, result.Price);
    }

    [Fact]
    public async Task UpdateAsync_UpdatesStorageLimit()
    {
        var package = new SubscriptionPackage { Name = "Pkg", Price = 100m, StorageLimitBytes = 1000, UnlockedFeatures = new(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.SubscriptionPackages.Add(package);
        await _context.SaveChangesAsync();

        var result = await _service.UpdateAsync(package.Id, new UpdateSubscriptionPackageRequest { StorageLimitBytes = 5000 });

        Assert.Equal(5000, result.StorageLimitBytes);
    }

    [Fact]
    public async Task UpdateAsync_UpdatesUnlockedFeatures()
    {
        var package = new SubscriptionPackage { Name = "Pkg", Price = 100m, StorageLimitBytes = 1000, UnlockedFeatures = new List<string> { "old" }, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.SubscriptionPackages.Add(package);
        await _context.SaveChangesAsync();

        var result = await _service.UpdateAsync(package.Id, new UpdateSubscriptionPackageRequest { UnlockedFeatures = new List<string> { "new1", "new2" } });

        Assert.Equal(2, result.UnlockedFeatures.Count);
        Assert.Contains("new1", result.UnlockedFeatures);
    }

    [Fact]
    public async Task UpdateAsync_ThrowsValidation_WhenNegativePrice()
    {
        var package = new SubscriptionPackage { Name = "Pkg", Price = 100m, StorageLimitBytes = 1000, UnlockedFeatures = new(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.SubscriptionPackages.Add(package);
        await _context.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<ValidationException>(
            () => _service.UpdateAsync(package.Id, new UpdateSubscriptionPackageRequest { Price = -5m }));
        Assert.Contains("Giá phải là số không âm", ex.Errors);
    }

    [Fact]
    public async Task UpdateAsync_ThrowsValidation_WhenZeroStorageLimit()
    {
        var package = new SubscriptionPackage { Name = "Pkg", Price = 100m, StorageLimitBytes = 1000, UnlockedFeatures = new(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.SubscriptionPackages.Add(package);
        await _context.SaveChangesAsync();

        var ex = await Assert.ThrowsAsync<ValidationException>(
            () => _service.UpdateAsync(package.Id, new UpdateSubscriptionPackageRequest { StorageLimitBytes = 0 }));
        Assert.Contains("Giới hạn lưu trữ phải là số dương", ex.Errors);
    }

    [Fact]
    public async Task UpdateAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<SubscriptionPackageNotFoundException>(
            () => _service.UpdateAsync(999, new UpdateSubscriptionPackageRequest { Name = "X" }));
    }

    // --- DeleteAsync ---

    [Fact]
    public async Task DeleteAsync_RemovesPackage()
    {
        var package = new SubscriptionPackage { Name = "Del", Price = 100m, StorageLimitBytes = 1000, UnlockedFeatures = new(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.SubscriptionPackages.Add(package);
        await _context.SaveChangesAsync();

        await _service.DeleteAsync(package.Id);

        Assert.Null(await _context.SubscriptionPackages.FindAsync(package.Id));
    }

    [Fact]
    public async Task DeleteAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<SubscriptionPackageNotFoundException>(() => _service.DeleteAsync(999));
    }

    [Fact]
    public async Task DeleteAsync_RemovedPackageNotInGetAll()
    {
        var package = new SubscriptionPackage { Name = "Gone", Price = 100m, StorageLimitBytes = 1000, UnlockedFeatures = new(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.SubscriptionPackages.Add(package);
        await _context.SaveChangesAsync();

        await _service.DeleteAsync(package.Id);

        var all = await _service.GetAllAsync();
        Assert.Empty(all);
    }
}
