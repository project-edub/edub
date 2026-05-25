using System.Text;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Services;
using Xceed.Words.NET;
using UglyToad.PdfPig;

namespace TeachingManagementPlatform.Api.Services;

public class FileParsingService : IFileParsingService
{
    private readonly IExcelService _excelService;
    private readonly ILogger<FileParsingService> _logger;

    public FileParsingService(IExcelService excelService, ILogger<FileParsingService> logger)
    {
        _excelService = excelService;
        _logger = logger;
    }

    public async Task<string> ExtractTextAsync(Stream stream, string extension)
    {
        if (stream == null) throw new ArgumentNullException(nameof(stream));
        if (string.IsNullOrWhiteSpace(extension)) throw new ArgumentNullException(nameof(extension));

        extension = extension.Trim().ToLowerInvariant();

        try
        {
            switch (extension)
            {
                case ".docx":
                    return await ExtractDocxTextAsync(stream);
                case ".pdf":
                    return await ExtractPdfTextAsync(stream);
                case ".xlsx":
                case ".xls":
                    return await ExtractExcelTextAsync(stream);
                default:
                    throw new NotSupportedException($"Extension '{extension}' is not supported for text extraction.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting text from file with extension {Extension}", extension);
            throw;
        }
    }

    private Task<string> ExtractDocxTextAsync(Stream stream)
    {
        // DocX expects a seekable stream; ensure we have one
        using var mem = new MemoryStream();
        stream.CopyTo(mem);
        mem.Position = 0;

        using var doc = DocX.Load(mem);
        var text = doc.Text ?? string.Empty;
        return Task.FromResult(text.Trim());
    }

    private Task<string> ExtractPdfTextAsync(Stream stream)
    {
        using var mem = new MemoryStream();
        stream.CopyTo(mem);
        mem.Position = 0;

        var sb = new StringBuilder();
        using var pdf = PdfDocument.Open(mem);
        foreach (var page in pdf.GetPages())
        {
            var pageText = page.Text;
            if (!string.IsNullOrWhiteSpace(pageText))
            {
                sb.AppendLine(pageText.Trim());
            }
        }

        return Task.FromResult(sb.ToString().Trim());
    }

    private Task<string> ExtractExcelTextAsync(Stream stream)
    {
        using var mem = new MemoryStream();
        stream.CopyTo(mem);
        mem.Position = 0;

        var rows = _excelService.ImportData(mem);
        var sb = new StringBuilder();
        foreach (var row in rows)
        {
            foreach (var kv in row)
            {
                if (!string.IsNullOrWhiteSpace(kv.Value))
                {
                    sb.Append(kv.Value.Trim());
                    sb.Append(' ');
                }
            }
            sb.AppendLine();
        }

        return Task.FromResult(sb.ToString().Trim());
    }
}
