using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

public class CoinService : ICoinService
{
    private readonly ApplicationDbContext _context;

    public CoinService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> GetBalanceAsync(int userId)
    {
        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            throw new UserNotFoundException("Không tìm thấy tài khoản");

        return user.CoinBalance;
    }

    public async Task<CoinWalletResponse> GetWalletAsync(int userId)
    {
        return new CoinWalletResponse { CoinBalance = await GetBalanceAsync(userId) };
    }

    public async Task<int> AddCoinsAsync(int userId, int amount)
    {
        if (amount <= 0)
            throw new CoinBalanceException("Số ECoin cộng thêm phải lớn hơn 0");

        var user = await GetUserAsync(userId);
        user.CoinBalance += amount;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return user.CoinBalance;
    }

    public async Task<int> DeductCoinsAsync(int userId, int amount)
    {
        if (amount <= 0)
            throw new CoinBalanceException("Số ECoin trừ đi phải lớn hơn 0");

        var user = await GetUserAsync(userId);
        if (user.CoinBalance < amount)
            throw new CoinBalanceException("Không đủ ECoin để thực hiện thao tác");

        user.CoinBalance -= amount;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return user.CoinBalance;
    }

    public async Task<List<SubscriptionPackageResponse>> GetActiveSubscriptionPackagesAsync()
    {
        return await _context.SubscriptionPackages
            .Where(sp => sp.IsActive)
            .Select(sp => new SubscriptionPackageResponse
            {
                Id = sp.Id,
                Name = sp.Name,
                Price = sp.Price,
                StorageLimitBytes = sp.StorageLimitBytes,
                MaxFilesPerQuizGeneration = sp.MaxFilesPerQuizGeneration,
                MaxQuestionsPerQuiz = sp.MaxQuestionsPerQuiz,
                MaxCrosswordFilesPerGeneration = sp.MaxCrosswordFilesPerGeneration,
                MaxCrosswordWordsPerGeneration = sp.MaxCrosswordWordsPerGeneration,
                MaxCrosswordGenerationsPerDay = sp.MaxCrosswordGenerationsPerDay,
                IsDefault = sp.IsDefault,
                IsActive = sp.IsActive,
                UnlockedFeatures = sp.UnlockedFeatures,
                CreatedAt = sp.CreatedAt,
                UpdatedAt = sp.UpdatedAt
            })
            .ToListAsync();
    }

    private async Task<User> GetUserAsync(int userId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            throw new UserNotFoundException("Không tìm thấy tài khoản");

        return user;
    }
}

public class CoinBalanceException : Exception
{
    public CoinBalanceException(string message) : base(message) { }
}