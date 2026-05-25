namespace TeachingManagementPlatform.Api.Interfaces;

public interface IFileParsingService
{
    /// <summary>
    /// Extract text content from a supported file stream.
    /// </summary>
    /// <param name="stream">File stream positioned at beginning</param>
    /// <param name="extension">File extension including dot (e.g. .docx, .pdf, .xlsx)</param>
    /// <returns>Extracted plain text.</returns>
    Task<string> ExtractTextAsync(Stream stream, string extension);
}
