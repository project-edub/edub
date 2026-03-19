using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Tests.Services;

public class ClassServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly ClassService _service;
    private readonly int _lecturerId;

    public ClassServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"ClassTest_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _service = new ClassService(_context);

        // Seed a lecturer user
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
    }

    public void Dispose()
    {
        _context.Dispose();
    }

    // --- GetAllAsync ---

    [Fact]
    public async Task GetAllAsync_ReturnsOnlyLecturerClasses()
    {
        var otherLecturer = new User { Email = "other@test.com", FullName = "Other", Role = "Lecturer", Status = "Active", PasswordHash = "hash" };
        _context.Users.Add(otherLecturer);
        await _context.SaveChangesAsync();

        _context.Classes.AddRange(
            new Class { LecturerId = _lecturerId, Name = "My Class", Year = "2024" },
            new Class { LecturerId = otherLecturer.Id, Name = "Other Class", Year = "2024" }
        );
        await _context.SaveChangesAsync();

        var result = await _service.GetAllAsync(_lecturerId);

        Assert.Single(result);
        Assert.Equal("My Class", result[0].Name);
    }

    [Fact]
    public async Task GetAllAsync_ReturnsEmptyList_WhenNoClasses()
    {
        var result = await _service.GetAllAsync(_lecturerId);
        Assert.Empty(result);
    }

    // --- GetByIdAsync ---

    [Fact]
    public async Task GetByIdAsync_ReturnsClass_WhenExists()
    {
        var cls = new Class { LecturerId = _lecturerId, Name = "Test Class", Year = "2024" };
        _context.Classes.Add(cls);
        await _context.SaveChangesAsync();

        var result = await _service.GetByIdAsync(cls.Id, _lecturerId);

        Assert.Equal("Test Class", result.Name);
        Assert.Equal("2024", result.Year);
    }

    [Fact]
    public async Task GetByIdAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<ClassNotFoundException>(() => _service.GetByIdAsync(999, _lecturerId));
    }

    [Fact]
    public async Task GetByIdAsync_Throws_WhenClassBelongsToOtherLecturer()
    {
        var other = new User { Email = "other2@test.com", FullName = "Other", Role = "Lecturer", Status = "Active", PasswordHash = "hash" };
        _context.Users.Add(other);
        var cls = new Class { LecturerId = other.Id, Name = "Other Class", Year = "2024" };
        _context.Classes.Add(cls);
        await _context.SaveChangesAsync();

        await Assert.ThrowsAsync<ClassNotFoundException>(() => _service.GetByIdAsync(cls.Id, _lecturerId));
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsStudentCount_FromMainList()
    {
        var cls = new Class { LecturerId = _lecturerId, Name = "Class With Students", Year = "2024" };
        _context.Classes.Add(cls);
        await _context.SaveChangesAsync();

        var mainList = new StudentList { ClassId = cls.Id, Name = "Main", IsMain = true, CreatedAt = DateTime.UtcNow };
        var otherList = new StudentList { ClassId = cls.Id, Name = "Other", IsMain = false, CreatedAt = DateTime.UtcNow };
        _context.StudentLists.AddRange(mainList, otherList);
        await _context.SaveChangesAsync();

        _context.StudentEntries.AddRange(
            new StudentEntry { StudentListId = mainList.Id, Data = new() { ["Name"] = "Student 1" }, SortOrder = 0 },
            new StudentEntry { StudentListId = mainList.Id, Data = new() { ["Name"] = "Student 2" }, SortOrder = 1 },
            new StudentEntry { StudentListId = otherList.Id, Data = new() { ["Name"] = "Other Student" }, SortOrder = 0 }
        );
        await _context.SaveChangesAsync();

        var result = await _service.GetByIdAsync(cls.Id, _lecturerId);

        Assert.Equal(2, result.StudentCount);
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsZeroStudentCount_WhenNoMainList()
    {
        var cls = new Class { LecturerId = _lecturerId, Name = "No Main", Year = "2024" };
        _context.Classes.Add(cls);
        await _context.SaveChangesAsync();

        var list = new StudentList { ClassId = cls.Id, Name = "Not Main", IsMain = false, CreatedAt = DateTime.UtcNow };
        _context.StudentLists.Add(list);
        _context.StudentEntries.Add(new StudentEntry { StudentListId = list.Id, Data = new() { ["Name"] = "S1" }, SortOrder = 0 });
        await _context.SaveChangesAsync();

        var result = await _service.GetByIdAsync(cls.Id, _lecturerId);

        Assert.Equal(0, result.StudentCount);
    }

    // --- CreateAsync ---

    [Fact]
    public async Task CreateAsync_CreatesClass()
    {
        var request = new CreateClassRequest { Name = "New Class", Year = "2025" };

        var result = await _service.CreateAsync(_lecturerId, request);

        Assert.Equal("New Class", result.Name);
        Assert.Equal("2025", result.Year);
        Assert.True(result.Id > 0);
    }

    [Fact]
    public async Task CreateAsync_ClassAppearsInGetAll()
    {
        var request = new CreateClassRequest { Name = "Listed Class", Year = "2025" };
        await _service.CreateAsync(_lecturerId, request);

        var all = await _service.GetAllAsync(_lecturerId);
        Assert.Single(all);
        Assert.Equal("Listed Class", all[0].Name);
    }

    // --- UpdateAsync ---

    [Fact]
    public async Task UpdateAsync_UpdatesName()
    {
        var cls = new Class { LecturerId = _lecturerId, Name = "Old Name", Year = "2024" };
        _context.Classes.Add(cls);
        await _context.SaveChangesAsync();

        var result = await _service.UpdateAsync(cls.Id, _lecturerId, new UpdateClassRequest { Name = "New Name" });

        Assert.Equal("New Name", result.Name);
        Assert.Equal("2024", result.Year);
    }

    [Fact]
    public async Task UpdateAsync_UpdatesYear()
    {
        var cls = new Class { LecturerId = _lecturerId, Name = "Class", Year = "2024" };
        _context.Classes.Add(cls);
        await _context.SaveChangesAsync();

        var result = await _service.UpdateAsync(cls.Id, _lecturerId, new UpdateClassRequest { Year = "2025" });

        Assert.Equal("2025", result.Year);
    }

    [Fact]
    public async Task UpdateAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<ClassNotFoundException>(
            () => _service.UpdateAsync(999, _lecturerId, new UpdateClassRequest { Name = "X" }));
    }

    // --- DeleteAsync ---

    [Fact]
    public async Task DeleteAsync_RemovesClass()
    {
        var cls = new Class { LecturerId = _lecturerId, Name = "To Delete", Year = "2024" };
        _context.Classes.Add(cls);
        await _context.SaveChangesAsync();

        await _service.DeleteAsync(cls.Id, _lecturerId);

        Assert.Null(await _context.Classes.FindAsync(cls.Id));
    }

    [Fact]
    public async Task DeleteAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<ClassNotFoundException>(() => _service.DeleteAsync(999, _lecturerId));
    }

    [Fact]
    public async Task DeleteAsync_CascadeDeletesStudentLists()
    {
        var cls = new Class { LecturerId = _lecturerId, Name = "Cascade Test", Year = "2024" };
        _context.Classes.Add(cls);
        await _context.SaveChangesAsync();

        var studentList = new StudentList { ClassId = cls.Id, Name = "Main", IsMain = true, CreatedAt = DateTime.UtcNow };
        _context.StudentLists.Add(studentList);
        await _context.SaveChangesAsync();

        _context.StudentEntries.Add(new StudentEntry { StudentListId = studentList.Id, Data = new() { ["Name"] = "S1" }, SortOrder = 0 });
        await _context.SaveChangesAsync();

        await _service.DeleteAsync(cls.Id, _lecturerId);

        Assert.Empty(await _context.StudentLists.Where(sl => sl.ClassId == cls.Id).ToListAsync());
        Assert.Empty(await _context.StudentEntries.Where(se => se.StudentListId == studentList.Id).ToListAsync());
    }

    [Fact]
    public async Task DeleteAsync_RemovedClassNotInGetAll()
    {
        var cls = new Class { LecturerId = _lecturerId, Name = "Gone", Year = "2024" };
        _context.Classes.Add(cls);
        await _context.SaveChangesAsync();

        await _service.DeleteAsync(cls.Id, _lecturerId);

        var all = await _service.GetAllAsync(_lecturerId);
        Assert.Empty(all);
    }

    // --- Student count in GetAllAsync ---

    [Fact]
    public async Task GetAllAsync_IncludesStudentCountFromMainList()
    {
        var cls = new Class { LecturerId = _lecturerId, Name = "With Count", Year = "2024" };
        _context.Classes.Add(cls);
        await _context.SaveChangesAsync();

        var mainList = new StudentList { ClassId = cls.Id, Name = "Main", IsMain = true, CreatedAt = DateTime.UtcNow };
        _context.StudentLists.Add(mainList);
        await _context.SaveChangesAsync();

        _context.StudentEntries.AddRange(
            new StudentEntry { StudentListId = mainList.Id, Data = new() { ["Name"] = "A" }, SortOrder = 0 },
            new StudentEntry { StudentListId = mainList.Id, Data = new() { ["Name"] = "B" }, SortOrder = 1 },
            new StudentEntry { StudentListId = mainList.Id, Data = new() { ["Name"] = "C" }, SortOrder = 2 }
        );
        await _context.SaveChangesAsync();

        var result = await _service.GetAllAsync(_lecturerId);

        Assert.Single(result);
        Assert.Equal(3, result[0].StudentCount);
    }
}
