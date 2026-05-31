using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

public class AccountService : IAccountService
{
    private readonly ApplicationDbContext _context;

    public AccountService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<AccountResponse>> GetAllAsync()
    {
        return await _context.Users
            .Where(u => u.Role == "Lecturer")
            .Select(u => new AccountResponse
            {
                Id = u.Id,
                Email = u.Email,
                FullName = u.FullName,
                Role = u.Role,
                Status = u.Status,
                CoinBalance = u.CoinBalance,
                SubscriptionPackageId = u.SubscriptionPackageId ?? 0,
                SubscriptionPackageName = u.SubscriptionPackage != null ? u.SubscriptionPackage.Name : string.Empty,
                StorageLimitBytes = u.SubscriptionPackage != null ? u.SubscriptionPackage.StorageLimitBytes : 0,
                StorageUsedBytes = u.StorageItems.Where(si => si.ItemType == "File").Sum(si => (long?)si.FileSize) ?? 0,
                CreatedAt = u.CreatedAt,
                UpdatedAt = u.UpdatedAt
            })
            .ToListAsync();
    }

    public async Task<AccountResponse> GetByIdAsync(int id)
    {
        var user = await _context.Users
            .Where(u => u.Id == id && u.Role == "Lecturer")
            .Select(u => new AccountResponse
            {
                Id = u.Id,
                Email = u.Email,
                FullName = u.FullName,
                Role = u.Role,
                Status = u.Status,
                CoinBalance = u.CoinBalance,
                SubscriptionPackageId = u.SubscriptionPackageId ?? 0,
                SubscriptionPackageName = u.SubscriptionPackage != null ? u.SubscriptionPackage.Name : string.Empty,
                StorageLimitBytes = u.SubscriptionPackage != null ? u.SubscriptionPackage.StorageLimitBytes : 0,
                StorageUsedBytes = u.StorageItems.Where(si => si.ItemType == "File").Sum(si => (long?)si.FileSize) ?? 0,
                CreatedAt = u.CreatedAt,
                UpdatedAt = u.UpdatedAt
            })
            .FirstOrDefaultAsync();

        if (user == null)
            throw new AccountNotFoundException("Không tìm thấy tài khoản");

        return user;
    }

    public async Task<AccountResponse> CreateAsync(CreateAccountRequest request)
    {
        var emailExists = await _context.Users.AnyAsync(u => u.Email == request.Email);
        if (emailExists)
            throw new EmailAlreadyExistsException("Email đã được sử dụng");

        var package = await ResolveSubscriptionPackageAsync(request.SubscriptionPackageId);

        var user = new User
        {
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = request.FullName,
            Role = "Lecturer",
            Status = "Active",
            CoinBalance = 0,
            SubscriptionPackageId = package.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return await GetByIdAsync(user.Id);
    }

    public async Task<AccountResponse> UpdateAsync(int id, UpdateAccountRequest request)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null || user.Role != "Lecturer")
            throw new AccountNotFoundException("Không tìm thấy tài khoản");

        if (request.Email != null)
        {
            var emailTaken = await _context.Users.AnyAsync(u => u.Email == request.Email && u.Id != id);
            if (emailTaken)
                throw new EmailAlreadyExistsException("Email đã được sử dụng");

            user.Email = request.Email;
        }

        if (request.FullName != null)
            user.FullName = request.FullName;

        if (request.Password != null)
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        if (request.CoinBalance.HasValue)
            user.CoinBalance = request.CoinBalance.Value;

        if (request.SubscriptionPackageId.HasValue)
            user.SubscriptionPackageId = (await ResolveSubscriptionPackageAsync(request.SubscriptionPackageId)).Id;

        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await GetByIdAsync(user.Id);
    }

    public async Task DeleteAsync(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null || user.Role != "Lecturer")
            throw new AccountNotFoundException("Không tìm thấy tài khoản");

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();
    }

    public async Task<AccountResponse> UpdateStatusAsync(int id, UpdateAccountStatusRequest request)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null || user.Role != "Lecturer")
            throw new AccountNotFoundException("Không tìm thấy tài khoản");

        user.Status = request.Status;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await GetByIdAsync(user.Id);
    }

    private async Task<SubscriptionPackage> ResolveSubscriptionPackageAsync(int? subscriptionPackageId)
    {
        SubscriptionPackage? package;

        if (subscriptionPackageId.HasValue)
        {
            package = await _context.SubscriptionPackages.FirstOrDefaultAsync(sp => sp.Id == subscriptionPackageId.Value);
            if (package == null)
                throw new AccountNotFoundException("Không tìm thấy gói subscription");
        }
        else
        {
            package = await _context.SubscriptionPackages.FirstOrDefaultAsync(sp => sp.IsDefault)
                ?? throw new AccountNotFoundException("Không tìm thấy gói subscription mặc định");
        }

        return package;
    }
}

public class AccountNotFoundException : Exception
{
    public AccountNotFoundException(string message) : base(message) { }
}
