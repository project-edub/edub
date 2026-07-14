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

        if (request.FreeEcoinBalance.HasValue)
            user.FreeEcoinBalance = request.FreeEcoinBalance.Value;

        if (request.SubscriptionPackageId.HasValue)
            user.SubscriptionPackageId = request.SubscriptionPackageId.Value == 0 ? null : request.SubscriptionPackageId.Value;

        if (request.SubscriptionExpiresAt.HasValue)
            user.SubscriptionExpiresAt = request.SubscriptionExpiresAt.Value;

        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return MapToResponse(user);
    }

    public async Task DeleteAsync(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null || user.Role != "Lecturer")
            throw new AccountNotFoundException("Không tìm thấy tài khoản");

        // Delete related entities that use Restrict delete behavior
        var classes = await _context.Classes.Where(c => c.LecturerId == id).ToListAsync();
        if (classes.Count > 0)
        {
            var classIds = classes.Select(c => c.Id).ToList();
            
            // Delete student lists and their children
            var studentLists = await _context.StudentLists.Where(sl => classIds.Contains(sl.ClassId)).ToListAsync();
            var slIds = studentLists.Select(sl => sl.Id).ToList();
            if (slIds.Count > 0)
            {
                _context.StudentEntries.RemoveRange(await _context.StudentEntries.Where(se => slIds.Contains(se.StudentListId)).ToListAsync());
                _context.StudentListColumns.RemoveRange(await _context.StudentListColumns.Where(sc => slIds.Contains(sc.StudentListId)).ToListAsync());
            }
            _context.StudentLists.RemoveRange(studentLists);

            // Delete class lesson schedules
            _context.ClassLessonSchedules.RemoveRange(await _context.ClassLessonSchedules.Where(s => classIds.Contains(s.ClassId)).ToListAsync());
            
            _context.Classes.RemoveRange(classes);
        }

        // Delete lesson plans and their children
        var lessonPlanIds = await _context.LessonPlans.Where(lp => lp.LecturerId == id).Select(lp => lp.Id).ToListAsync();
        if (lessonPlanIds.Count > 0)
        {
            var lessonIds = await _context.Lessons.Where(l => lessonPlanIds.Contains(l.LessonPlanId)).Select(l => l.Id).ToListAsync();
            if (lessonIds.Count > 0)
            {
                _context.LessonDocuments.RemoveRange(await _context.LessonDocuments.Where(d => lessonIds.Contains(d.LessonId)).ToListAsync());
                _context.LessonAttachments.RemoveRange(await _context.LessonAttachments.Where(a => lessonIds.Contains(a.LessonId)).ToListAsync());
                _context.MiniGames.RemoveRange(await _context.MiniGames.Where(g => lessonIds.Contains(g.LessonId)).ToListAsync());
                _context.LessonSuggestionCaches.RemoveRange(await _context.LessonSuggestionCaches.Where(c => lessonIds.Contains(c.LessonId)).ToListAsync());
                _context.Lessons.RemoveRange(await _context.Lessons.Where(l => lessonPlanIds.Contains(l.LessonPlanId)).ToListAsync());
            }
            _context.LessonPlans.RemoveRange(await _context.LessonPlans.Where(lp => lp.LecturerId == id).ToListAsync());
        }

        // Delete storage items
        _context.StorageItems.RemoveRange(await _context.StorageItems.Where(si => si.LecturerId == id).ToListAsync());

        // Delete coin purchase transactions
        _context.CoinPurchaseTransactions.RemoveRange(await _context.CoinPurchaseTransactions.Where(t => t.UserId == id).ToListAsync());

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
            FreeEcoinBalance = user.FreeEcoinBalance,
            SubscriptionPackageId = user.SubscriptionPackageId,
            SubscriptionExpiresAt = user.SubscriptionExpiresAt,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
    }
}

public class AccountNotFoundException : Exception
{
    public AccountNotFoundException(string message) : base(message) { }
}
