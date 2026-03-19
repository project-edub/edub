using ClosedXML.Excel;
using TeachingManagementPlatform.Api.Interfaces;

namespace TeachingManagementPlatform.Api.Services;

public class ExcelService : IExcelService
{
    public List<string> ValidateHeaders(Stream excelStream, List<string> expectedColumns)
    {
        using var workbook = new XLWorkbook(excelStream);
        var worksheet = workbook.Worksheets.First();
        var firstRow = worksheet.FirstRowUsed();

        if (firstRow == null)
            return new List<string>(expectedColumns);

        var actualHeaders = new List<string>();
        foreach (var cell in firstRow.CellsUsed())
        {
            actualHeaders.Add(cell.GetString().Trim());
        }

        var mismatched = expectedColumns
            .Where(expected => !actualHeaders.Contains(expected, StringComparer.OrdinalIgnoreCase))
            .ToList();

        return mismatched;
    }

    public List<Dictionary<string, string>> ImportData(Stream excelStream)
    {
        using var workbook = new XLWorkbook(excelStream);
        var worksheet = workbook.Worksheets.First();
        var rows = new List<Dictionary<string, string>>();

        var headerRow = worksheet.FirstRowUsed();
        if (headerRow == null)
            return rows;

        var headers = new List<string>();
        foreach (var cell in headerRow.CellsUsed())
        {
            headers.Add(cell.GetString().Trim());
        }

        var dataRows = worksheet.RowsUsed().Skip(1);
        foreach (var row in dataRows)
        {
            var dict = new Dictionary<string, string>();
            for (int i = 0; i < headers.Count; i++)
            {
                var cell = row.Cell(i + 1);
                dict[headers[i]] = cell.GetString().Trim();
            }
            rows.Add(dict);
        }

        return rows;
    }

    public byte[] ExportData(List<string> columns, List<Dictionary<string, string>> rows)
    {
        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Sheet1");

        // Write header row
        for (int i = 0; i < columns.Count; i++)
        {
            worksheet.Cell(1, i + 1).Value = columns[i];
        }

        // Write data rows
        for (int rowIdx = 0; rowIdx < rows.Count; rowIdx++)
        {
            for (int colIdx = 0; colIdx < columns.Count; colIdx++)
            {
                var colName = columns[colIdx];
                if (rows[rowIdx].TryGetValue(colName, out var value))
                {
                    worksheet.Cell(rowIdx + 2, colIdx + 1).Value = value;
                }
            }
        }

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }
}
