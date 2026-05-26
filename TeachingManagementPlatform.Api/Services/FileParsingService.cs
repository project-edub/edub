using System.Text;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Services;
using Xceed.Words.NET;
using UglyToad.PdfPig;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Drawing;

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
                case ".pptx":
                    return await ExtractPptxTextAsync(stream);
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

    private Task<string> ExtractPptxTextAsync(Stream stream)
    {
        using var mem = new MemoryStream();
        stream.CopyTo(mem);
        mem.Position = 0;

        var sb = new StringBuilder();
        try
        {
            using var presentation = PresentationDocument.Open(mem, false);
            var presentationPart = presentation.PresentationPart;
            if (presentationPart == null)
                return Task.FromResult(string.Empty);

            foreach (var slidePart in presentationPart.SlideParts)
            {
                var texts = slidePart.Slide.Descendants<DocumentFormat.OpenXml.Drawing.Text>();
                foreach (var t in texts)
                {
                    if (!string.IsNullOrWhiteSpace(t.Text))
                    {
                        sb.AppendLine(t.Text.Trim());
                    }
                }

                if (slidePart.NotesSlidePart != null)
                {
                    var noteTexts = slidePart.NotesSlidePart.NotesSlide.Descendants<DocumentFormat.OpenXml.Drawing.Text>();
                    foreach (var nt in noteTexts)
                    {
                        if (!string.IsNullOrWhiteSpace(nt.Text))
                            sb.AppendLine(nt.Text.Trim());
                    }
                }

                sb.AppendLine();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to extract PPTX text");
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
