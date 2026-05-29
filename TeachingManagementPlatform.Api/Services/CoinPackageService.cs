using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

public class CoinPackageService : ICoinPackageService
{
    private readonly ApplicationDbContext _context;

    public CoinPackageService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<CoinPackageResponse>> GetAllAsync(bool onlyActive = false)
    {
        var query = _context.CoinPackages.AsQueryable();
        if (onlyActive)
        {
            query = query.Where(package => package.IsActive);
        }

        return await query
            .OrderByDescending(package => package.CoinAmount)
            .ThenBy(package => package.Price)
            .Select(package => MapToResponse(package))
            .ToListAsync();
    }

    public async Task<CoinPackageResponse> GetByIdAsync(int id)
    {
        var package = await _context.CoinPackages.FindAsync(id);
        if (package == null)
            throw new CoinPackageNotFoundException("Không tìm thấy gói ECoin");

        return MapToResponse(package);
    }

    public async Task<CoinPackageResponse> CreateAsync(CreateCoinPackageRequest request)
    {
        Validate(request.Price, request.CoinAmount, request.Name);

        var package = new CoinPackage
        {
            Name = request.Name.Trim(),
            Price = request.Price,
            CoinAmount = request.CoinAmount,
            Description = request.Description?.Trim(),
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.CoinPackages.Add(package);
        await _context.SaveChangesAsync();

        return MapToResponse(package);
    }

    public async Task<CoinPackageResponse> UpdateAsync(int id, UpdateCoinPackageRequest request)
    {
        var package = await _context.CoinPackages.FindAsync(id);
        if (package == null)
            throw new CoinPackageNotFoundException("Không tìm thấy gói ECoin");

        var price = request.Price ?? package.Price;
        var coinAmount = request.CoinAmount ?? package.CoinAmount;
        var name = request.Name ?? package.Name;
        Validate(price, coinAmount, name);

        if (request.Name != null)
            package.Name = request.Name.Trim();

        if (request.Price.HasValue)
            package.Price = request.Price.Value;

        if (request.CoinAmount.HasValue)
            package.CoinAmount = request.CoinAmount.Value;

        if (request.Description != null)
            package.Description = request.Description.Trim();

        if (request.IsActive.HasValue)
            package.IsActive = request.IsActive.Value;

        package.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return MapToResponse(package);
    }

    public async Task DeleteAsync(int id)
    {
        var package = await _context.CoinPackages.FindAsync(id);
        if (package == null)
            throw new CoinPackageNotFoundException("Không tìm thấy gói ECoin");

        _context.CoinPackages.Remove(package);
        await _context.SaveChangesAsync();
    }

    private static void Validate(decimal price, int coinAmount, string name)
    {
        var errors = new List<string>();

        if (string.IsNullOrWhiteSpace(name))
            errors.Add("Tên gói không được để trống");

        if (price < 0)
            errors.Add("Giá phải là số không âm");

        if (coinAmount <= 0)
            errors.Add("Số ECoin phải lớn hơn 0");

        if (errors.Count > 0)
            throw new ValidationException(errors);
    }

    private static CoinPackageResponse MapToResponse(CoinPackage package)
    {
        return new CoinPackageResponse
        {
            Id = package.Id,
            Name = package.Name,
            Price = package.Price,
            CoinAmount = package.CoinAmount,
            Description = package.Description,
            IsActive = package.IsActive,
            CreatedAt = package.CreatedAt,
            UpdatedAt = package.UpdatedAt
        };
    }
}

public class CoinPackageNotFoundException : Exception
{
    public CoinPackageNotFoundException(string message) : base(message) { }
}