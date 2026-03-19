using ClosedXML.Excel;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Tests.Services;

public class ExcelServiceTests
{
    private readonly ExcelService _service = new();

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

    // --- ValidateHeaders ---

    [Fact]
    public void ValidateHeaders_ReturnsEmpty_WhenAllHeadersMatch()
    {
        var expected = new List<string> { "Họ tên", "Điểm" };
        using var stream = CreateExcelStream(expected, new());

        var mismatched = _service.ValidateHeaders(stream, expected);

        Assert.Empty(mismatched);
    }

    [Fact]
    public void ValidateHeaders_ReturnsMissingHeaders()
    {
        var actual = new List<string> { "Họ tên" };
        var expected = new List<string> { "Họ tên", "Điểm", "Email" };
        using var stream = CreateExcelStream(actual, new());

        var mismatched = _service.ValidateHeaders(stream, expected);

        Assert.Equal(2, mismatched.Count);
        Assert.Contains("Điểm", mismatched);
        Assert.Contains("Email", mismatched);
    }

    [Fact]
    public void ValidateHeaders_IsCaseInsensitive()
    {
        var actual = new List<string> { "họ tên", "điểm" };
        var expected = new List<string> { "Họ Tên", "Điểm" };
        using var stream = CreateExcelStream(actual, new());

        var mismatched = _service.ValidateHeaders(stream, expected);

        Assert.Empty(mismatched);
    }

    [Fact]
    public void ValidateHeaders_ReturnsAllExpected_WhenSheetIsEmpty()
    {
        var workbook = new XLWorkbook();
        workbook.Worksheets.Add("Sheet1");
        var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;

        var expected = new List<string> { "A", "B" };
        var mismatched = _service.ValidateHeaders(stream, expected);

        Assert.Equal(2, mismatched.Count);
    }

    // --- ImportData ---

    [Fact]
    public void ImportData_ParsesRowsIntoDictionaries()
    {
        var headers = new List<string> { "Họ tên", "Điểm" };
        var data = new List<List<string>>
        {
            new() { "Nguyễn Văn A", "9" },
            new() { "Trần Thị B", "8" }
        };
        using var stream = CreateExcelStream(headers, data);

        var result = _service.ImportData(stream);

        Assert.Equal(2, result.Count);
        Assert.Equal("Nguyễn Văn A", result[0]["Họ tên"]);
        Assert.Equal("9", result[0]["Điểm"]);
        Assert.Equal("Trần Thị B", result[1]["Họ tên"]);
        Assert.Equal("8", result[1]["Điểm"]);
    }

    [Fact]
    public void ImportData_ReturnsEmpty_WhenNoDataRows()
    {
        var headers = new List<string> { "Name" };
        using var stream = CreateExcelStream(headers, new());

        var result = _service.ImportData(stream);

        Assert.Empty(result);
    }

    [Fact]
    public void ImportData_ReturnsEmpty_WhenSheetIsEmpty()
    {
        var workbook = new XLWorkbook();
        workbook.Worksheets.Add("Sheet1");
        var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Position = 0;

        var result = _service.ImportData(stream);

        Assert.Empty(result);
    }

    [Fact]
    public void ImportData_HandlesEmptyCells()
    {
        var headers = new List<string> { "Name", "Score" };
        var data = new List<List<string>> { new() { "Alice" } }; // Score cell missing
        using var stream = CreateExcelStream(headers, data);

        var result = _service.ImportData(stream);

        Assert.Single(result);
        Assert.Equal("Alice", result[0]["Name"]);
        Assert.Equal("", result[0]["Score"]);
    }

    // --- ExportData ---

    [Fact]
    public void ExportData_GeneratesValidExcel()
    {
        var columns = new List<string> { "Họ tên", "Điểm" };
        var rows = new List<Dictionary<string, string>>
        {
            new() { ["Họ tên"] = "Nguyễn Văn A", ["Điểm"] = "9" },
            new() { ["Họ tên"] = "Trần Thị B", ["Điểm"] = "8" }
        };

        var bytes = _service.ExportData(columns, rows);

        Assert.NotEmpty(bytes);

        // Verify by reading back
        using var stream = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(stream);
        var ws = workbook.Worksheets.First();

        Assert.Equal("Họ tên", ws.Cell(1, 1).GetString());
        Assert.Equal("Điểm", ws.Cell(1, 2).GetString());
        Assert.Equal("Nguyễn Văn A", ws.Cell(2, 1).GetString());
        Assert.Equal("9", ws.Cell(2, 2).GetString());
        Assert.Equal("Trần Thị B", ws.Cell(3, 1).GetString());
        Assert.Equal("8", ws.Cell(3, 2).GetString());
    }

    [Fact]
    public void ExportData_HandlesEmptyRows()
    {
        var columns = new List<string> { "Name" };
        var rows = new List<Dictionary<string, string>>();

        var bytes = _service.ExportData(columns, rows);

        using var stream = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(stream);
        var ws = workbook.Worksheets.First();

        Assert.Equal("Name", ws.Cell(1, 1).GetString());
        Assert.Null(ws.RowsUsed().Skip(1).FirstOrDefault());
    }

    [Fact]
    public void ExportData_HandlesMissingKeysInRow()
    {
        var columns = new List<string> { "Name", "Score" };
        var rows = new List<Dictionary<string, string>>
        {
            new() { ["Name"] = "Alice" } // no Score key
        };

        var bytes = _service.ExportData(columns, rows);

        using var stream = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(stream);
        var ws = workbook.Worksheets.First();

        Assert.Equal("Alice", ws.Cell(2, 1).GetString());
        Assert.Equal("", ws.Cell(2, 2).GetString());
    }

    // --- Round-trip ---

    [Fact]
    public void ExportThenImport_ProducesIdenticalData()
    {
        var columns = new List<string> { "Họ tên", "Điểm", "Email" };
        var rows = new List<Dictionary<string, string>>
        {
            new() { ["Họ tên"] = "Nguyễn Văn A", ["Điểm"] = "9", ["Email"] = "a@test.com" },
            new() { ["Họ tên"] = "Trần Thị B", ["Điểm"] = "8", ["Email"] = "b@test.com" }
        };

        var bytes = _service.ExportData(columns, rows);
        using var stream = new MemoryStream(bytes);
        var imported = _service.ImportData(stream);

        Assert.Equal(rows.Count, imported.Count);
        for (int i = 0; i < rows.Count; i++)
        {
            foreach (var col in columns)
            {
                Assert.Equal(rows[i][col], imported[i][col]);
            }
        }
    }
}
