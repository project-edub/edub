using Microsoft.Extensions.Configuration;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Tests.Services;

public class LocalFileStorageTests : IDisposable
{
    private readonly string _testBasePath;
    private readonly LocalFileStorage _storage;

    public LocalFileStorageTests()
    {
        _testBasePath = Path.Combine(Path.GetTempPath(), $"filestorage_test_{Guid.NewGuid()}");
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["FileStorage:BasePath"] = _testBasePath
            })
            .Build();
        _storage = new LocalFileStorage(config);
    }

    public void Dispose()
    {
        if (Directory.Exists(_testBasePath))
            Directory.Delete(_testBasePath, true);
    }

    [Fact]
    public async Task SaveFileAsync_ReturnsFileReference_AndPersistsFile()
    {
        var content = "hello world"u8.ToArray();
        using var stream = new MemoryStream(content);

        var reference = await _storage.SaveFileAsync(stream, "test.txt");

        Assert.False(string.IsNullOrEmpty(reference));
        Assert.EndsWith(".txt", reference);
        Assert.True(File.Exists(Path.Combine(_testBasePath, reference)));
    }

    [Fact]
    public async Task GetFileAsync_ReturnsCorrectContent()
    {
        var content = "file content"u8.ToArray();
        using var input = new MemoryStream(content);
        var reference = await _storage.SaveFileAsync(input, "doc.pdf");

        using var result = await _storage.GetFileAsync(reference);
        using var reader = new MemoryStream();
        await result.CopyToAsync(reader);

        Assert.Equal(content, reader.ToArray());
    }

    [Fact]
    public async Task GetFileAsync_ThrowsFileNotFoundException_WhenMissing()
    {
        await Assert.ThrowsAsync<FileNotFoundException>(
            () => _storage.GetFileAsync("nonexistent.txt"));
    }

    [Fact]
    public async Task DeleteFileAsync_RemovesFile()
    {
        using var stream = new MemoryStream("data"u8.ToArray());
        var reference = await _storage.SaveFileAsync(stream, "delete-me.txt");

        await _storage.DeleteFileAsync(reference);

        Assert.False(File.Exists(Path.Combine(_testBasePath, reference)));
    }

    [Fact]
    public async Task DeleteFileAsync_DoesNotThrow_WhenFileMissing()
    {
        await _storage.DeleteFileAsync("no-such-file.txt");
    }

    [Fact]
    public async Task GetMetadataAsync_ReturnsCorrectMetadata()
    {
        var content = new byte[1024];
        Random.Shared.NextBytes(content);
        using var stream = new MemoryStream(content);
        var reference = await _storage.SaveFileAsync(stream, "meta.bin");

        var metadata = await _storage.GetMetadataAsync(reference);

        Assert.Equal(reference, metadata.Name);
        Assert.Equal(1024, metadata.Size);
        Assert.True(metadata.ModifiedAt <= DateTime.UtcNow);
    }

    [Fact]
    public async Task GetMetadataAsync_ThrowsFileNotFoundException_WhenMissing()
    {
        await Assert.ThrowsAsync<FileNotFoundException>(
            () => _storage.GetMetadataAsync("missing.bin"));
    }

    [Fact]
    public void Constructor_CreatesBaseDirectory()
    {
        var newPath = Path.Combine(Path.GetTempPath(), $"filestorage_ctor_{Guid.NewGuid()}");
        try
        {
            var config = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["FileStorage:BasePath"] = newPath
                })
                .Build();
            _ = new LocalFileStorage(config);

            Assert.True(Directory.Exists(newPath));
        }
        finally
        {
            if (Directory.Exists(newPath))
                Directory.Delete(newPath, true);
        }
    }
}
