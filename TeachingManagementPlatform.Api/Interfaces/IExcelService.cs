namespace TeachingManagementPlatform.Api.Interfaces;

public interface IExcelService
{
    List<string> ValidateHeaders(Stream excelStream, List<string> expectedColumns);
    List<Dictionary<string, string>> ImportData(Stream excelStream);
    byte[] ExportData(List<string> columns, List<Dictionary<string, string>> rows);
}
