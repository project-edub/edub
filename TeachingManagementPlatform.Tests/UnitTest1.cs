using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;

namespace TeachingManagementPlatform.Tests;

public class ApplicationDbContextTests
{
    [Fact]
    public void ApplicationDbContext_CanBeCreated_WithInMemoryDatabase()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: "TestDb")
            .Options;

        using var context = new ApplicationDbContext(options);
        Assert.NotNull(context);
    }
}
