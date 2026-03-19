using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Tests.Services;

public class StudentListImportExportTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly StudentListService _studentListService;
    private readonly ExcelService _excelService;
    private readonly int _lecturerId;
    private readonly int _classId;
    private readonly int _studentListId;

    public StudentListImportExportTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"ImportExportTest_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _studentListService = new StudentListService(_context);
        _excelService = new ExcelService();

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

        // Seed student list with columns
        var sl = new StudentList
        {
            ClassId = _classId,
            Name = "Import Test List",
            IsMain = false,
            CreatedAt = DateTime.UtcNow
        };
        _context.StudentLists.Add(sl);
        _context.SaveChanges();
        _studentListId = sl.Id;

        _context.StudentListColumns.AddRange(
            new StudentListColumn { StudentListId = _studentListId, Name = "Họ tên", SortOrder = 0 },
            new StudentListColumn { StudentListId = _studentListId, Name = "Điểm", SortOrder = 1 }
        );
        _context.SaveChanges();
    }

    public void Dispose() => _context.Dispose();

    private static MemoryStream CreateExcelStream(List<string> headers, List<List<string>> dataRows)
    {
        var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Sheet1");

        for (int i = 0; i < headers.Count; i++)
            worksheet.Cell(1, i + 1).Value = headers[i];

        for (int r = 0; r < dataRows.Count; r++)
            for (int c = 0; c < dataRows[r].Count; c++)
                worksheet.Cell(r + 2, c + 1).Value = dataRows[r][c];

        var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;
        return stream;
    }

    // --- GetByIdAsync ---

    [Fact]
    public async Task GetByIdAsync_ReturnsStudentListWithColumnsAndEntries()
    {
        var result = await _studentListService.GetByIdAsync(_studentListId, _lecturerId);

        Assert.Equal(_studentListId, result.Id);
        Assert.Equal("Import Test List", result.Name);
        Assert.Equal(2, result.Columns.Count);
    }

    [Fact]
    public async Task GetByIdAsync_Throws_WhenNotFound()
    {
        await Assert.ThrowsAsync<StudentListNotFoundException>(
            () => _studentListService.GetByIdAsync(9999, _lecturerId));
    }

    [Fact]
    public async Task GetByIdAsync_Throws_WhenNotOwned()
    {
        var other = new User { Email = "other@test.com", FullName = "Other", Role = "Lecturer", Status = "Active", PasswordHash = "h" };
        _context.Users.Add(other);
        await _context.SaveChangesAsync();

        await Assert.ThrowsAsync<StudentListNotFoundException>(
            () => _studentListService.GetByIdAsync(_studentListId, other.Id));
    }

    // --- Import flow: validate headers + import data + add entries ---

    [Fact]
    public async Task ImportFlow_ValidHeaders_ImportsDataSuccessfully()
    {
        var headers = new List<string> { "Họ tên", "Điểm" };
        var data = new List<List<string>>
        {
            new() { "Nguyễn Văn A", "9" },
            new() { "Trần Thị B", "8" }
        };
        using var stream = CreateExcelStream(headers, data);

        // Get student list columns
        var studentList = await _studentListService.GetByIdAsync(_studentListId, _lecturerId);
        var columnNames = studentList.Columns.Select(c => c.Name).ToList();

        // Validate headers
        var mismatched = _excelService.ValidateHeaders(stream, columnNames);
        Assert.Empty(mismatched);

        // Import data
        stream.Position = 0;
        var importedRows = _excelService.ImportData(stream);
        Assert.Equal(2, importedRows.Count);

        // Add entries
        var sortOrder = 0;
        foreach (var row in importedRows)
        {
            await _studentListService.AddEntryAsync(_studentListId, _lecturerId, new CreateEntryRequest
            {
                Data = row,
                SortOrder = sortOrder++
            });
        }

        // Verify entries were added
        var updatedList = await _studentListService.GetByIdAsync(_studentListId, _lecturerId);
        Assert.Equal(2, updatedList.Entries.Count);
        Assert.Equal("Nguyễn Văn A", updatedList.Entries[0].Data["Họ tên"]);
        Assert.Equal("9", updatedList.Entries[0].Data["Điểm"]);
        Assert.Equal("Trần Thị B", updatedList.Entries[1].Data["Họ tên"]);
    }

    [Fact]
    public void ImportFlow_MismatchedHeaders_ReturnsMismatches()
    {
        var headers = new List<string> { "Name", "Score" }; // Wrong headers
        using var stream = CreateExcelStream(headers, new());

        var columnNames = new List<string> { "Họ tên", "Điểm" };
        var mismatched = _excelService.ValidateHeaders(stream, columnNames);

        Assert.Equal(2, mismatched.Count);
        Assert.Contains("Họ tên", mismatched);
        Assert.Contains("Điểm", mismatched);
    }

    [Fact]
    public void ImportFlow_PartialMismatch_ReturnsOnlyMismatched()
    {
        var headers = new List<string> { "Họ tên", "Score" }; // One correct, one wrong
        using var stream = CreateExcelStream(headers, new());

        var columnNames = new List<string> { "Họ tên", "Điểm" };
        var mismatched = _excelService.ValidateHeaders(stream, columnNames);

        Assert.Single(mismatched);
        Assert.Contains("Điểm", mismatched);
    }

    // --- Export flow: get list + export data ---

    [Fact]
    public async Task ExportFlow_GeneratesExcelWithColumnsAndData()
    {
        // Add some entries first
        await _studentListService.AddEntryAsync(_studentListId, _lecturerId, new CreateEntryRequest
        {
            Data = new() { ["Họ tên"] = "Nguyễn Văn A", ["Điểm"] = "9" },
            SortOrder = 0
        });
        await _studentListService.AddEntryAsync(_studentListId, _lecturerId, new CreateEntryRequest
        {
            Data = new() { ["Họ tên"] = "Trần Thị B", ["Điểm"] = "8" },
            SortOrder = 1
        });

        // Get student list
        var studentList = await _studentListService.GetByIdAsync(_studentListId, _lecturerId);
        var columnNames = studentList.Columns.Select(c => c.Name).ToList();
        var rows = studentList.Entries.Select(e => e.Data).ToList();

        // Export
        var bytes = _excelService.ExportData(columnNames, rows);
        Assert.NotEmpty(bytes);

        // Verify exported content
        using var stream = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(stream);
        var ws = workbook.Worksheets.First();

        Assert.Equal("Họ tên", ws.Cell(1, 1).GetString());
        Assert.Equal("Điểm", ws.Cell(1, 2).GetString());
        Assert.Equal("Nguyễn Văn A", ws.Cell(2, 1).GetString());
        Assert.Equal("9", ws.Cell(2, 2).GetString());
    }

    [Fact]
    public async Task ExportFlow_EmptyList_GeneratesExcelWithHeadersOnly()
    {
        var studentList = await _studentListService.GetByIdAsync(_studentListId, _lecturerId);
        var columnNames = studentList.Columns.Select(c => c.Name).ToList();
        var rows = studentList.Entries.Select(e => e.Data).ToList();

        var bytes = _excelService.ExportData(columnNames, rows);

        using var stream = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(stream);
        var ws = workbook.Worksheets.First();

        Assert.Equal("Họ tên", ws.Cell(1, 1).GetString());
        Assert.Equal("Điểm", ws.Cell(1, 2).GetString());
        Assert.Null(ws.RowsUsed().Skip(1).FirstOrDefault());
    }

    // --- Round-trip: export then import ---

    [Fact]
    public async Task RoundTrip_ExportThenImport_ProducesIdenticalData()
    {
        // Add entries
        await _studentListService.AddEntryAsync(_studentListId, _lecturerId, new CreateEntryRequest
        {
            Data = new() { ["Họ tên"] = "Nguyễn Văn A", ["Điểm"] = "10" },
            SortOrder = 0
        });
        await _studentListService.AddEntryAsync(_studentListId, _lecturerId, new CreateEntryRequest
        {
            Data = new() { ["Họ tên"] = "Trần Thị B", ["Điểm"] = "7" },
            SortOrder = 1
        });

        // Export
        var studentList = await _studentListService.GetByIdAsync(_studentListId, _lecturerId);
        var columnNames = studentList.Columns.Select(c => c.Name).ToList();
        var originalRows = studentList.Entries.Select(e => e.Data).ToList();
        var bytes = _excelService.ExportData(columnNames, originalRows);

        // Import into a new student list
        var newList = await _studentListService.CreateAsync(_classId, _lecturerId, new CreateStudentListRequest { Name = "Imported" });
        foreach (var col in columnNames)
        {
            await _studentListService.AddColumnAsync(newList.Id, _lecturerId, new CreateColumnRequest { Name = col, SortOrder = 0 });
        }

        using var importStream = new MemoryStream(bytes);
        var importedRows = _excelService.ImportData(importStream);

        var sortOrder = 0;
        foreach (var row in importedRows)
        {
            await _studentListService.AddEntryAsync(newList.Id, _lecturerId, new CreateEntryRequest
            {
                Data = row,
                SortOrder = sortOrder++
            });
        }

        // Verify
        var importedList = await _studentListService.GetByIdAsync(newList.Id, _lecturerId);
        Assert.Equal(originalRows.Count, importedList.Entries.Count);
        for (int i = 0; i < originalRows.Count; i++)
        {
            foreach (var col in columnNames)
            {
                Assert.Equal(originalRows[i][col], importedList.Entries[i].Data[col]);
            }
        }
    }
}
