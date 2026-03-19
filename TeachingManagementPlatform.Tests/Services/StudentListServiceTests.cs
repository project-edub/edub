using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Tests.Services;

public class StudentListServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly StudentListService _service;
    private readonly int _lecturerId;
    private readonly int _classId;

    public StudentListServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"StudentListTest_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _service = new StudentListService(_context);

        // Seed lecturer
        var lecturer = new User
        {
            Email = "lecturer@test.com",
            FullName = "Test Lecturer",
            Role = "Lecturer",
            Status = "Active",
            PasswordHash = "hash"
        };
        _context.Users.Add(lecturer);
        _context.SaveChanges();
        _lecturerId = lecturer.Id;

        // Seed class
        var cls = new Class
        {
            LecturerId = _lecturerId,
            Name = "Test Class",
            Year = "2024",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Classes.Add(cls);
        _context.SaveChanges();
        _classId = cls.Id;
    }

    public void Dispose() => _context.Dispose();

    // --- GetAllByClassAsync ---

    [Fact]
    public async Task GetAllByClassAsync_ReturnsListsForClass()
    {
        _context.StudentLists.Add(new StudentList { ClassId = _classId, Name = "List 1", CreatedAt = DateTime.UtcNow });
        _context.StudentLists.Add(new StudentList { ClassId = _classId, Name = "List 2", CreatedAt = DateTime.UtcNow });
        await _context.SaveChangesAsync();

        var result = await _service.GetAllByClassAsync(_classId, _lecturerId);

        Assert.Equal(2, result.Count);
    }

    [Fact]
    public async Task GetAllByClassAsync_ReturnsEmpty_WhenNoLists()
    {
        var result = await _service.GetAllByClassAsync(_classId, _lecturerId);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetAllByClassAsync_Throws_WhenClassNotOwned()
    {
        var other = new User { Email = "other@test.com", FullName = "Other", Role = "Lecturer", Status = "Active", PasswordHash = "h" };
        _context.Users.Add(other);
        await _context.SaveChangesAsync();

        await Assert.ThrowsAsync<ClassNotFoundException>(() => _service.GetAllByClassAsync(_classId, other.Id));
    }

    [Fact]
    public async Task GetAllByClassAsync_IncludesColumnsAndEntries()
    {
        var sl = new StudentList { ClassId = _classId, Name = "With Data", CreatedAt = DateTime.UtcNow };
        _context.StudentLists.Add(sl);
        await _context.SaveChangesAsync();

        _context.StudentListColumns.Add(new StudentListColumn { StudentListId = sl.Id, Name = "Name", SortOrder = 0 });
        _context.StudentEntries.Add(new StudentEntry { StudentListId = sl.Id, Data = new() { ["Name"] = "Alice" }, SortOrder = 0 });
        await _context.SaveChangesAsync();

        var result = await _service.GetAllByClassAsync(_classId, _lecturerId);

        Assert.Single(result);
        Assert.Single(result[0].Columns);
        Assert.Single(result[0].Entries);
    }

    // --- CreateAsync ---

    [Fact]
    public async Task CreateAsync_CreatesStudentList()
    {
        var result = await _service.CreateAsync(_classId, _lecturerId, new CreateStudentListRequest { Name = "New List" });

        Assert.Equal("New List", result.Name);
        Assert.Equal(_classId, result.ClassId);
        Assert.False(result.IsMain);
        Assert.True(result.Id > 0);
    }

    [Fact]
    public async Task CreateAsync_Throws_WhenClassNotOwned()
    {
        await Assert.ThrowsAsync<ClassNotFoundException>(
            () => _service.CreateAsync(_classId, 9999, new CreateStudentListRequest { Name = "X" }));
    }

    // --- UpdateAsync ---

    [Fact]
    public async Task UpdateAsync_UpdatesName()
    {
        var sl = new StudentList { ClassId = _classId, Name = "Old", CreatedAt = DateTime.UtcNow };
        _context.StudentLists.Add(sl);
        await _context.SaveChangesAsync();

        var result = await _service.UpdateAsync(sl.Id, _lecturerId, new UpdateStudentListRequest { Name = "New" });

        Assert.Equal("New", result.Name);
    }

    [Fact]
    public async Task UpdateAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<StudentListNotFoundException>(
            () => _service.UpdateAsync(999, _lecturerId, new UpdateStudentListRequest { Name = "X" }));
    }

    // --- DeleteAsync ---

    [Fact]
    public async Task DeleteAsync_RemovesList()
    {
        var sl = new StudentList { ClassId = _classId, Name = "ToDelete", CreatedAt = DateTime.UtcNow };
        _context.StudentLists.Add(sl);
        await _context.SaveChangesAsync();

        await _service.DeleteAsync(sl.Id, _lecturerId);

        Assert.Null(await _context.StudentLists.FindAsync(sl.Id));
    }

    [Fact]
    public async Task DeleteAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<StudentListNotFoundException>(() => _service.DeleteAsync(999, _lecturerId));
    }

    // --- SetMainAsync ---

    [Fact]
    public async Task SetMainAsync_SetsMainAndUnsetsOthers()
    {
        var sl1 = new StudentList { ClassId = _classId, Name = "List 1", IsMain = true, CreatedAt = DateTime.UtcNow };
        var sl2 = new StudentList { ClassId = _classId, Name = "List 2", IsMain = false, CreatedAt = DateTime.UtcNow };
        _context.StudentLists.AddRange(sl1, sl2);
        await _context.SaveChangesAsync();

        var result = await _service.SetMainAsync(sl2.Id, _lecturerId);

        Assert.True(result.IsMain);

        var updatedSl1 = await _context.StudentLists.FindAsync(sl1.Id);
        Assert.False(updatedSl1!.IsMain);
    }

    [Fact]
    public async Task SetMainAsync_OnlyOneMainPerClass()
    {
        var sl1 = new StudentList { ClassId = _classId, Name = "A", IsMain = false, CreatedAt = DateTime.UtcNow };
        var sl2 = new StudentList { ClassId = _classId, Name = "B", IsMain = false, CreatedAt = DateTime.UtcNow };
        var sl3 = new StudentList { ClassId = _classId, Name = "C", IsMain = false, CreatedAt = DateTime.UtcNow };
        _context.StudentLists.AddRange(sl1, sl2, sl3);
        await _context.SaveChangesAsync();

        await _service.SetMainAsync(sl2.Id, _lecturerId);

        var mainCount = await _context.StudentLists.CountAsync(sl => sl.ClassId == _classId && sl.IsMain);
        Assert.Equal(1, mainCount);
    }

    [Fact]
    public async Task SetMainAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<StudentListNotFoundException>(() => _service.SetMainAsync(999, _lecturerId));
    }

    // --- CloneAsync ---

    [Fact]
    public async Task CloneAsync_ClonesListWithColumnsAndEntries()
    {
        var sl = new StudentList { ClassId = _classId, Name = "Original", IsMain = true, CreatedAt = DateTime.UtcNow };
        _context.StudentLists.Add(sl);
        await _context.SaveChangesAsync();

        _context.StudentListColumns.AddRange(
            new StudentListColumn { StudentListId = sl.Id, Name = "Name", SortOrder = 0 },
            new StudentListColumn { StudentListId = sl.Id, Name = "Score", SortOrder = 1 }
        );
        _context.StudentEntries.AddRange(
            new StudentEntry { StudentListId = sl.Id, Data = new() { ["Name"] = "Alice", ["Score"] = "90" }, SortOrder = 0 },
            new StudentEntry { StudentListId = sl.Id, Data = new() { ["Name"] = "Bob", ["Score"] = "85" }, SortOrder = 1 }
        );
        await _context.SaveChangesAsync();

        var clone = await _service.CloneAsync(sl.Id, _lecturerId);

        Assert.NotEqual(sl.Id, clone.Id);
        Assert.Equal("Original (Copy)", clone.Name);
        Assert.False(clone.IsMain);
        Assert.Equal(2, clone.Columns.Count);
        Assert.Equal(2, clone.Entries.Count);
        Assert.Equal("Alice", clone.Entries[0].Data["Name"]);
        Assert.Equal("Score", clone.Columns[1].Name);
    }

    [Fact]
    public async Task CloneAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<StudentListNotFoundException>(() => _service.CloneAsync(999, _lecturerId));
    }

    // --- AddColumnAsync ---

    [Fact]
    public async Task AddColumnAsync_AddsColumn()
    {
        var sl = new StudentList { ClassId = _classId, Name = "List", CreatedAt = DateTime.UtcNow };
        _context.StudentLists.Add(sl);
        await _context.SaveChangesAsync();

        var result = await _service.AddColumnAsync(sl.Id, _lecturerId, new CreateColumnRequest { Name = "Email", SortOrder = 0 });

        Assert.Equal("Email", result.Name);
        Assert.Equal(sl.Id, result.StudentListId);
    }

    [Fact]
    public async Task AddColumnAsync_Throws_WhenListNotFound()
    {
        await Assert.ThrowsAsync<StudentListNotFoundException>(
            () => _service.AddColumnAsync(999, _lecturerId, new CreateColumnRequest { Name = "X", SortOrder = 0 }));
    }

    // --- UpdateColumnAsync ---

    [Fact]
    public async Task UpdateColumnAsync_UpdatesColumnName()
    {
        var sl = new StudentList { ClassId = _classId, Name = "List", CreatedAt = DateTime.UtcNow };
        _context.StudentLists.Add(sl);
        await _context.SaveChangesAsync();

        var col = new StudentListColumn { StudentListId = sl.Id, Name = "Old", SortOrder = 0 };
        _context.StudentListColumns.Add(col);
        await _context.SaveChangesAsync();

        var result = await _service.UpdateColumnAsync(col.Id, _lecturerId, new UpdateColumnRequest { Name = "New" });

        Assert.Equal("New", result.Name);
    }

    [Fact]
    public async Task UpdateColumnAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<StudentListNotFoundException>(
            () => _service.UpdateColumnAsync(999, _lecturerId, new UpdateColumnRequest { Name = "X" }));
    }

    // --- DeleteColumnAsync ---

    [Fact]
    public async Task DeleteColumnAsync_RemovesColumn()
    {
        var sl = new StudentList { ClassId = _classId, Name = "List", CreatedAt = DateTime.UtcNow };
        _context.StudentLists.Add(sl);
        await _context.SaveChangesAsync();

        var col = new StudentListColumn { StudentListId = sl.Id, Name = "Col", SortOrder = 0 };
        _context.StudentListColumns.Add(col);
        await _context.SaveChangesAsync();

        await _service.DeleteColumnAsync(col.Id, _lecturerId);

        Assert.Null(await _context.StudentListColumns.FindAsync(col.Id));
    }

    [Fact]
    public async Task DeleteColumnAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<StudentListNotFoundException>(() => _service.DeleteColumnAsync(999, _lecturerId));
    }

    // --- AddEntryAsync ---

    [Fact]
    public async Task AddEntryAsync_AddsEntry()
    {
        var sl = new StudentList { ClassId = _classId, Name = "List", CreatedAt = DateTime.UtcNow };
        _context.StudentLists.Add(sl);
        await _context.SaveChangesAsync();

        var result = await _service.AddEntryAsync(sl.Id, _lecturerId,
            new CreateEntryRequest { Data = new() { ["Name"] = "Alice" }, SortOrder = 0 });

        Assert.Equal("Alice", result.Data["Name"]);
        Assert.Equal(sl.Id, result.StudentListId);
    }

    [Fact]
    public async Task AddEntryAsync_Throws_WhenListNotFound()
    {
        await Assert.ThrowsAsync<StudentListNotFoundException>(
            () => _service.AddEntryAsync(999, _lecturerId, new CreateEntryRequest { Data = new(), SortOrder = 0 }));
    }

    // --- UpdateEntryAsync ---

    [Fact]
    public async Task UpdateEntryAsync_UpdatesData()
    {
        var sl = new StudentList { ClassId = _classId, Name = "List", CreatedAt = DateTime.UtcNow };
        _context.StudentLists.Add(sl);
        await _context.SaveChangesAsync();

        var entry = new StudentEntry { StudentListId = sl.Id, Data = new() { ["Name"] = "Old" }, SortOrder = 0 };
        _context.StudentEntries.Add(entry);
        await _context.SaveChangesAsync();

        var result = await _service.UpdateEntryAsync(entry.Id, _lecturerId,
            new UpdateEntryRequest { Data = new() { ["Name"] = "New" } });

        Assert.Equal("New", result.Data["Name"]);
    }

    [Fact]
    public async Task UpdateEntryAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<StudentListNotFoundException>(
            () => _service.UpdateEntryAsync(999, _lecturerId, new UpdateEntryRequest { Data = new() }));
    }

    // --- DeleteEntryAsync ---

    [Fact]
    public async Task DeleteEntryAsync_RemovesEntry()
    {
        var sl = new StudentList { ClassId = _classId, Name = "List", CreatedAt = DateTime.UtcNow };
        _context.StudentLists.Add(sl);
        await _context.SaveChangesAsync();

        var entry = new StudentEntry { StudentListId = sl.Id, Data = new() { ["Name"] = "X" }, SortOrder = 0 };
        _context.StudentEntries.Add(entry);
        await _context.SaveChangesAsync();

        await _service.DeleteEntryAsync(entry.Id, _lecturerId);

        Assert.Null(await _context.StudentEntries.FindAsync(entry.Id));
    }

    [Fact]
    public async Task DeleteEntryAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<StudentListNotFoundException>(() => _service.DeleteEntryAsync(999, _lecturerId));
    }

    // --- Ownership verification ---

    [Fact]
    public async Task UpdateAsync_Throws_WhenListBelongsToOtherLecturer()
    {
        var other = new User { Email = "other2@test.com", FullName = "Other", Role = "Lecturer", Status = "Active", PasswordHash = "h" };
        _context.Users.Add(other);
        var otherClass = new Class { LecturerId = other.Id, Name = "Other Class", Year = "2024", CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow };
        _context.Classes.Add(otherClass);
        await _context.SaveChangesAsync();

        var sl = new StudentList { ClassId = otherClass.Id, Name = "Other List", CreatedAt = DateTime.UtcNow };
        _context.StudentLists.Add(sl);
        await _context.SaveChangesAsync();

        await Assert.ThrowsAsync<StudentListNotFoundException>(
            () => _service.UpdateAsync(sl.Id, _lecturerId, new UpdateStudentListRequest { Name = "Hacked" }));
    }
}
