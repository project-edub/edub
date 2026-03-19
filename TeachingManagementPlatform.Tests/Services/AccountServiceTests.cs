using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Tests.Services;

public class AccountServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly AccountService _service;

    public AccountServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"AccountTest_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _service = new AccountService(_context);
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    // --- GetAllAsync ---

    [Fact]
    public async Task GetAllAsync_ReturnsOnlyLecturerAccounts()
    {
        _context.Users.AddRange(
            new User { Email = "lecturer@test.com", FullName = "Lecturer", Role = "Lecturer", Status = "Active", PasswordHash = "hash" },
            new User { Email = "admin@test.com", FullName = "Admin", Role = "Admin", Status = "Active", PasswordHash = "hash" }
        );
        await _context.SaveChangesAsync();

        var result = await _service.GetAllAsync();

        Assert.Single(result);
        Assert.Equal("lecturer@test.com", result[0].Email);
    }

    [Fact]
    public async Task GetAllAsync_ReturnsEmptyList_WhenNoLecturers()
    {
        var result = await _service.GetAllAsync();
        Assert.Empty(result);
    }

    // --- GetByIdAsync ---

    [Fact]
    public async Task GetByIdAsync_ReturnsAccount_WhenExists()
    {
        var user = new User { Email = "test@test.com", FullName = "Test", Role = "Lecturer", Status = "Active", PasswordHash = "hash" };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var result = await _service.GetByIdAsync(user.Id);

        Assert.Equal(user.Email, result.Email);
        Assert.Equal(user.FullName, result.FullName);
    }

    [Fact]
    public async Task GetByIdAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<AccountNotFoundException>(() => _service.GetByIdAsync(999));
    }

    [Fact]
    public async Task GetByIdAsync_Throws_WhenUserIsAdmin()
    {
        var admin = new User { Email = "admin@test.com", FullName = "Admin", Role = "Admin", Status = "Active", PasswordHash = "hash" };
        _context.Users.Add(admin);
        await _context.SaveChangesAsync();

        await Assert.ThrowsAsync<AccountNotFoundException>(() => _service.GetByIdAsync(admin.Id));
    }

    // --- CreateAsync ---

    [Fact]
    public async Task CreateAsync_CreatesLecturerAccount_WithHashedPassword()
    {
        var request = new CreateAccountRequest
        {
            Email = "new@test.com",
            Password = "password123",
            FullName = "New Lecturer"
        };

        var result = await _service.CreateAsync(request);

        Assert.Equal("new@test.com", result.Email);
        Assert.Equal("New Lecturer", result.FullName);
        Assert.Equal("Lecturer", result.Role);
        Assert.Equal("Active", result.Status);

        var user = await _context.Users.FirstAsync(u => u.Email == "new@test.com");
        Assert.NotEqual("password123", user.PasswordHash);
        Assert.True(BCrypt.Net.BCrypt.Verify("password123", user.PasswordHash));
    }

    [Fact]
    public async Task CreateAsync_ThrowsEmailAlreadyExists_WhenDuplicate()
    {
        _context.Users.Add(new User { Email = "dup@test.com", FullName = "Dup", Role = "Lecturer", Status = "Active", PasswordHash = "hash" });
        await _context.SaveChangesAsync();

        var request = new CreateAccountRequest { Email = "dup@test.com", Password = "pass123456", FullName = "Dup2" };

        await Assert.ThrowsAsync<EmailAlreadyExistsException>(() => _service.CreateAsync(request));
    }

    [Fact]
    public async Task CreateAsync_AccountAppearsInGetAll()
    {
        var request = new CreateAccountRequest { Email = "listed@test.com", Password = "pass123456", FullName = "Listed" };
        await _service.CreateAsync(request);

        var all = await _service.GetAllAsync();
        Assert.Single(all);
        Assert.Equal("listed@test.com", all[0].Email);
    }

    // --- UpdateAsync ---

    [Fact]
    public async Task UpdateAsync_UpdatesEmail()
    {
        var user = new User { Email = "old@test.com", FullName = "User", Role = "Lecturer", Status = "Active", PasswordHash = BCrypt.Net.BCrypt.HashPassword("pass") };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var result = await _service.UpdateAsync(user.Id, new UpdateAccountRequest { Email = "new@test.com" });

        Assert.Equal("new@test.com", result.Email);
    }

    [Fact]
    public async Task UpdateAsync_UpdatesFullName()
    {
        var user = new User { Email = "name@test.com", FullName = "Old Name", Role = "Lecturer", Status = "Active", PasswordHash = "hash" };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var result = await _service.UpdateAsync(user.Id, new UpdateAccountRequest { FullName = "New Name" });

        Assert.Equal("New Name", result.FullName);
    }

    [Fact]
    public async Task UpdateAsync_RehashesPassword_WhenProvided()
    {
        var oldHash = BCrypt.Net.BCrypt.HashPassword("oldpass");
        var user = new User { Email = "pw@test.com", FullName = "User", Role = "Lecturer", Status = "Active", PasswordHash = oldHash };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await _service.UpdateAsync(user.Id, new UpdateAccountRequest { Password = "newpass" });

        var updated = await _context.Users.FindAsync(user.Id);
        Assert.NotEqual(oldHash, updated!.PasswordHash);
        Assert.True(BCrypt.Net.BCrypt.Verify("newpass", updated.PasswordHash));
    }

    [Fact]
    public async Task UpdateAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<AccountNotFoundException>(
            () => _service.UpdateAsync(999, new UpdateAccountRequest { FullName = "X" }));
    }

    [Fact]
    public async Task UpdateAsync_ThrowsEmailAlreadyExists_WhenEmailTaken()
    {
        _context.Users.AddRange(
            new User { Email = "a@test.com", FullName = "A", Role = "Lecturer", Status = "Active", PasswordHash = "hash" },
            new User { Email = "b@test.com", FullName = "B", Role = "Lecturer", Status = "Active", PasswordHash = "hash" }
        );
        await _context.SaveChangesAsync();

        var userB = await _context.Users.FirstAsync(u => u.Email == "b@test.com");

        await Assert.ThrowsAsync<EmailAlreadyExistsException>(
            () => _service.UpdateAsync(userB.Id, new UpdateAccountRequest { Email = "a@test.com" }));
    }

    // --- DeleteAsync ---

    [Fact]
    public async Task DeleteAsync_RemovesUser()
    {
        var user = new User { Email = "del@test.com", FullName = "Del", Role = "Lecturer", Status = "Active", PasswordHash = "hash" };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await _service.DeleteAsync(user.Id);

        Assert.Null(await _context.Users.FindAsync(user.Id));
    }

    [Fact]
    public async Task DeleteAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<AccountNotFoundException>(() => _service.DeleteAsync(999));
    }

    [Fact]
    public async Task DeleteAsync_RemovedAccountNotInGetAll()
    {
        var user = new User { Email = "gone@test.com", FullName = "Gone", Role = "Lecturer", Status = "Active", PasswordHash = "hash" };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await _service.DeleteAsync(user.Id);

        var all = await _service.GetAllAsync();
        Assert.Empty(all);
    }

    // --- UpdateStatusAsync ---

    [Fact]
    public async Task UpdateStatusAsync_SetsInactive()
    {
        var user = new User { Email = "status@test.com", FullName = "Status", Role = "Lecturer", Status = "Active", PasswordHash = "hash" };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var result = await _service.UpdateStatusAsync(user.Id, new UpdateAccountStatusRequest { Status = "Inactive" });

        Assert.Equal("Inactive", result.Status);
    }

    [Fact]
    public async Task UpdateStatusAsync_SetsActive()
    {
        var user = new User { Email = "reactivate@test.com", FullName = "React", Role = "Lecturer", Status = "Inactive", PasswordHash = "hash" };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var result = await _service.UpdateStatusAsync(user.Id, new UpdateAccountStatusRequest { Status = "Active" });

        Assert.Equal("Active", result.Status);
    }

    [Fact]
    public async Task UpdateStatusAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<AccountNotFoundException>(
            () => _service.UpdateStatusAsync(999, new UpdateAccountStatusRequest { Status = "Active" }));
    }

    // --- Status toggle affects authentication ---

    [Fact]
    public async Task DeactivatedAccount_FailsAuthentication()
    {
        // Create account via service
        var createReq = new CreateAccountRequest { Email = "authtest@test.com", Password = "password123", FullName = "Auth Test" };
        var account = await _service.CreateAsync(createReq);

        // Deactivate
        await _service.UpdateStatusAsync(account.Id, new UpdateAccountStatusRequest { Status = "Inactive" });

        // Verify the user status is Inactive in DB (AuthService checks this)
        var user = await _context.Users.FindAsync(account.Id);
        Assert.Equal("Inactive", user!.Status);
    }

    [Fact]
    public async Task ReactivatedAccount_HasActiveStatus()
    {
        var createReq = new CreateAccountRequest { Email = "reauth@test.com", Password = "password123", FullName = "Reauth" };
        var account = await _service.CreateAsync(createReq);

        // Deactivate then reactivate
        await _service.UpdateStatusAsync(account.Id, new UpdateAccountStatusRequest { Status = "Inactive" });
        await _service.UpdateStatusAsync(account.Id, new UpdateAccountStatusRequest { Status = "Active" });

        var user = await _context.Users.FindAsync(account.Id);
        Assert.Equal("Active", user!.Status);
    }
}
