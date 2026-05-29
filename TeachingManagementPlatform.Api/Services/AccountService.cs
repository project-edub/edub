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
            .Select(u => MapToResponse(u))
            .ToListAsync();
    }

    public async Task<AccountResponse> GetByIdAsync(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null || user.Role != "Lecturer")
            throw new AccountNotFoundException("Không tìm thấy tài khoản");

        return MapToResponse(user);
    }

    public async Task<AccountResponse> CreateAsync(CreateAccountRequest request)
    {
        var emailExists = await _context.Users.AnyAsync(u => u.Email == request.Email);
        if (emailExists)
            throw new EmailAlreadyExistsException("Email đã được sử dụng");

        var user = new User
        {
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = request.FullName,
            Role = "Lecturer",
            Status = "Active",
            CoinBalance = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return MapToResponse(user);
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

        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return MapToResponse(user);
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

        return MapToResponse(user);
    }

    private static AccountResponse MapToResponse(User user)
    {
        return new AccountResponse
        {
            Id = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            Role = user.Role,
            Status = user.Status,
            CoinBalance = user.CoinBalance,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
    }
}

public class AccountNotFoundException : Exception
{
    public AccountNotFoundException(string message) : base(message) { }
}
