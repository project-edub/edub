using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Tests.Services;

public class StorageServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly FakeFileStorage _fileStorage;
    private readonly StorageService _service;
    private readonly int _lecturerId;

    public StorageServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"StorageTest_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _fileStorage = new FakeFileStorage();
        _service = new StorageService(_context, _fileStorage);

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

    // --- CreateFolderAsync ---

    [Fact]
    public async Task CreateFolderAsync_CreatesFolder_ReturnsResponse()
    {
        var result = await _service.CreateFolderAsync(_lecturerId, new CreateFolderRequest { Name = "Tài liệu" });

        Assert.Equal("Tài liệu", result.Name);
        Assert.Equal("Folder", result.ItemType);
        Assert.Null(result.ParentFolderId);
    }

    [Fact]
    public async Task CreateFolderAsync_InSubfolder_SetsParentId()
    {
        var parent = await _service.CreateFolderAsync(_lecturerId, new CreateFolderRequest { Name = "Parent" });
        var child = await _service.CreateFolderAsync(_lecturerId, new CreateFolderRequest { Name = "Child", ParentFolderId = parent.Id });

        Assert.Equal(parent.Id, child.ParentFolderId);
    }

    [Fact]
    public async Task CreateFolderAsync_EmptyName_ThrowsValidation()
    {
        await Assert.ThrowsAsync<StorageValidationException>(
            () => _service.CreateFolderAsync(_lecturerId, new CreateFolderRequest { Name = "" }));
    }

    [Fact]
    public async Task CreateFolderAsync_InvalidParent_ThrowsNotFound()
    {
        await Assert.ThrowsAsync<StorageItemNotFoundException>(
            () => _service.CreateFolderAsync(_lecturerId, new CreateFolderRequest { Name = "Test", ParentFolderId = 999 }));
    }

    // --- UploadFileAsync ---

    [Fact]
    public async Task UploadFileAsync_SavesFileAndMetadata()
    {
        using var stream = new MemoryStream(new byte[] { 1, 2, 3 });
        var result = await _service.UploadFileAsync(_lecturerId, null, stream, "report.docx", 3);

        Assert.Equal("report.docx", result.Name);
        Assert.Equal("File", result.ItemType);
        Assert.Equal("word", result.FileType);
        Assert.Equal(3, result.FileSize);
        Assert.Single(_fileStorage.SavedFiles);
    }

    [Fact]
    public async Task UploadFileAsync_PdfFile_SetsCorrectType()
    {
        using var stream = new MemoryStream(new byte[] { 1 });
        var result = await _service.UploadFileAsync(_lecturerId, null, stream, "doc.pdf", 1);

        Assert.Equal("pdf", result.FileType);
    }

    [Fact]
    public async Task UploadFileAsync_UnknownExtension_NullFileType()
    {
        using var stream = new MemoryStream(new byte[] { 1 });
        var result = await _service.UploadFileAsync(_lecturerId, null, stream, "image.png", 1);

        Assert.Null(result.FileType);
    }

    [Fact]
    public async Task UploadFileAsync_InFolder_SetsParentId()
    {
        var folder = await _service.CreateFolderAsync(_lecturerId, new CreateFolderRequest { Name = "Folder" });

        using var stream = new MemoryStream(new byte[] { 1 });
        var result = await _service.UploadFileAsync(_lecturerId, folder.Id, stream, "test.txt", 1);

        Assert.Equal(folder.Id, result.ParentFolderId);
        Assert.Equal("text", result.FileType);
    }

    // --- ListItemsAsync ---

    [Fact]
    public async Task ListItemsAsync_ReturnsRootItems()
    {
        await _service.CreateFolderAsync(_lecturerId, new CreateFolderRequest { Name = "Folder1" });
        using var stream = new MemoryStream(new byte[] { 1 });
        await _service.UploadFileAsync(_lecturerId, null, stream, "file.txt", 1);

        var items = await _service.ListItemsAsync(_lecturerId, null, new StorageListRequest());

        Assert.Equal(2, items.Count);
    }

    [Fact]
    public async Task ListItemsAsync_SearchFilter_MatchesByName()
    {
        await _service.CreateFolderAsync(_lecturerId, new CreateFolderRequest { Name = "Bài giảng" });
        await _service.CreateFolderAsync(_lecturerId, new CreateFolderRequest { Name = "Tài liệu" });

        var items = await _service.ListItemsAsync(_lecturerId, null, new StorageListRequest { Search = "bài" });

        Assert.Single(items);
        Assert.Equal("Bài giảng", items[0].Name);
    }

    [Fact]
    public async Task ListItemsAsync_FileTypeFilter_ReturnsOnlyMatchingFiles()
    {
        using var s1 = new MemoryStream(new byte[] { 1 });
        await _service.UploadFileAsync(_lecturerId, null, s1, "doc.docx", 1);
        using var s2 = new MemoryStream(new byte[] { 1 });
        await _service.UploadFileAsync(_lecturerId, null, s2, "sheet.xlsx", 1);
        using var s3 = new MemoryStream(new byte[] { 1 });
        await _service.UploadFileAsync(_lecturerId, null, s3, "note.txt", 1);

        var items = await _service.ListItemsAsync(_lecturerId, null, new StorageListRequest { FileType = "word" });

        Assert.Single(items);
        Assert.Equal("doc.docx", items[0].Name);
    }

    [Fact]
    public async Task ListItemsAsync_SortByNameAsc()
    {
        await _service.CreateFolderAsync(_lecturerId, new CreateFolderRequest { Name = "Zebra" });
        await _service.CreateFolderAsync(_lecturerId, new CreateFolderRequest { Name = "Alpha" });

        var items = await _service.ListItemsAsync(_lecturerId, null,
            new StorageListRequest { SortBy = "name", SortDirection = "asc", FoldersFirst = false });

        Assert.Equal("Alpha", items[0].Name);
        Assert.Equal("Zebra", items[1].Name);
    }

    [Fact]
    public async Task ListItemsAsync_SortByNameDesc()
    {
        await _service.CreateFolderAsync(_lecturerId, new CreateFolderRequest { Name = "Alpha" });
        await _service.CreateFolderAsync(_lecturerId, new CreateFolderRequest { Name = "Zebra" });

        var items = await _service.ListItemsAsync(_lecturerId, null,
            new StorageListRequest { SortBy = "name", SortDirection = "desc", FoldersFirst = false });

        Assert.Equal("Zebra", items[0].Name);
        Assert.Equal("Alpha", items[1].Name);
    }

    [Fact]
    public async Task ListItemsAsync_FoldersFirst_FoldersBeforeFiles()
    {
        using var s1 = new MemoryStream(new byte[] { 1 });
        await _service.UploadFileAsync(_lecturerId, null, s1, "aaa.txt", 1);
        await _service.CreateFolderAsync(_lecturerId, new CreateFolderRequest { Name = "zzz_folder" });

        var items = await _service.ListItemsAsync(_lecturerId, null,
            new StorageListRequest { SortBy = "name", SortDirection = "asc", FoldersFirst = true });

        Assert.Equal("Folder", items[0].ItemType);
        Assert.Equal("File", items[1].ItemType);
    }

    [Fact]
    public async Task ListItemsAsync_FolderContents_OnlyShowsChildren()
    {
        var folder = await _service.CreateFolderAsync(_lecturerId, new CreateFolderRequest { Name = "Parent" });
        await _service.CreateFolderAsync(_lecturerId, new CreateFolderRequest { Name = "Child", ParentFolderId = folder.Id });
        await _service.CreateFolderAsync(_lecturerId, new CreateFolderRequest { Name = "RootFolder" });

        var items = await _service.ListItemsAsync(_lecturerId, folder.Id, new StorageListRequest());

        Assert.Single(items);
        Assert.Equal("Child", items[0].Name);
    }

    [Fact]
    public async Task ListItemsAsync_OtherLecturerItems_NotVisible()
    {
        var other = new User { Email = "other@test.com", FullName = "Other", Role = "Lecturer", Status = "Active", PasswordHash = "hash" };
        _context.Users.Add(other);
        await _context.SaveChangesAsync();

        await _service.CreateFolderAsync(other.Id, new CreateFolderRequest { Name = "Other's Folder" });
        await _service.CreateFolderAsync(_lecturerId, new CreateFolderRequest { Name = "My Folder" });

        var items = await _service.ListItemsAsync(_lecturerId, null, new StorageListRequest());

        Assert.Single(items);
        Assert.Equal("My Folder", items[0].Name);
    }

    // --- RenameAsync ---

    [Fact]
    public async Task RenameAsync_UpdatesName()
    {
        var folder = await _service.CreateFolderAsync(_lecturerId, new CreateFolderRequest { Name = "Old Name" });
        var result = await _service.RenameAsync(folder.Id, _lecturerId, new RenameItemRequest { Name = "New Name" });

        Assert.Equal("New Name", result.Name);
    }

    [Fact]
    public async Task RenameAsync_NotFound_Throws()
    {
        await Assert.ThrowsAsync<StorageItemNotFoundException>(
            () => _service.RenameAsync(999, _lecturerId, new RenameItemRequest { Name = "Test" }));
    }

    [Fact]
    public async Task RenameAsync_EmptyName_ThrowsValidation()
    {
        var folder = await _service.CreateFolderAsync(_lecturerId, new CreateFolderRequest { Name = "Folder" });
        await Assert.ThrowsAsync<StorageValidationException>(
            () => _service.RenameAsync(folder.Id, _lecturerId, new RenameItemRequest { Name = "  " }));
    }

    // --- DeleteAsync ---

    [Fact]
    public async Task DeleteAsync_RemovesItem()
    {
        var folder = await _service.CreateFolderAsync(_lecturerId, new CreateFolderRequest { Name = "ToDelete" });
        await _service.DeleteAsync(folder.Id, _lecturerId);

        var items = await _service.ListItemsAsync(_lecturerId, null, new StorageListRequest());
        Assert.Empty(items);
    }

    [Fact]
    public async Task DeleteAsync_File_DeletesPhysicalFile()
    {
        using var stream = new MemoryStream(new byte[] { 1 });
        var file = await _service.UploadFileAsync(_lecturerId, null, stream, "test.pdf", 1);

        await _service.DeleteAsync(file.Id, _lecturerId);

        Assert.Single(_fileStorage.DeletedFiles);
    }

    [Fact]
    public async Task DeleteAsync_FolderWithChildren_CascadeDeletes()
    {
        var parent = await _service.CreateFolderAsync(_lecturerId, new CreateFolderRequest { Name = "Parent" });
        await _service.CreateFolderAsync(_lecturerId, new CreateFolderRequest { Name = "Child", ParentFolderId = parent.Id });

        using var stream = new MemoryStream(new byte[] { 1 });
        await _service.UploadFileAsync(_lecturerId, parent.Id, stream, "nested.docx", 1);

        await _service.DeleteAsync(parent.Id, _lecturerId);

        var allItems = await _context.StorageItems.Where(si => si.LecturerId == _lecturerId).ToListAsync();
        Assert.Empty(allItems);
        Assert.Single(_fileStorage.DeletedFiles);
    }

    [Fact]
    public async Task DeleteAsync_NotFound_Throws()
    {
        await Assert.ThrowsAsync<StorageItemNotFoundException>(
            () => _service.DeleteAsync(999, _lecturerId));
    }

    // --- Date range filter ---

    [Fact]
    public async Task ListItemsAsync_DateRangeToday_FiltersCorrectly()
    {
        var todayItem = new StorageItem
        {
            LecturerId = _lecturerId,
            Name = "Today",
            ItemType = "Folder",
            ModifiedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        var oldItem = new StorageItem
        {
            LecturerId = _lecturerId,
            Name = "Old",
            ItemType = "Folder",
            ModifiedAt = DateTime.UtcNow.AddDays(-5),
            CreatedAt = DateTime.UtcNow.AddDays(-5)
        };
        _context.StorageItems.AddRange(todayItem, oldItem);
        await _context.SaveChangesAsync();

        var items = await _service.ListItemsAsync(_lecturerId, null, new StorageListRequest { DateRange = "today" });

        Assert.Single(items);
        Assert.Equal("Today", items[0].Name);
    }

    // --- File type extension mapping ---

    [Theory]
    [InlineData("file.xls", "excel")]
    [InlineData("file.xlsx", "excel")]
    [InlineData("file.ppt", "powerpoint")]
    [InlineData("file.pptx", "powerpoint")]
    [InlineData("file.doc", "word")]
    [InlineData("file.docx", "word")]
    [InlineData("file.txt", "text")]
    [InlineData("file.pdf", "pdf")]
    public async Task UploadFileAsync_MapsExtensionToFileType(string fileName, string expectedType)
    {
        using var stream = new MemoryStream(new byte[] { 1 });
        var result = await _service.UploadFileAsync(_lecturerId, null, stream, fileName, 1);

        Assert.Equal(expectedType, result.FileType);
    }
}
