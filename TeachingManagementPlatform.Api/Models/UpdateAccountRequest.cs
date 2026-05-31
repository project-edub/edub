using System.ComponentModel.DataAnnotations;

namespace TeachingManagementPlatform.Api.Models;

public class UpdateAccountRequest
{
    [EmailAddress]
    public string? Email { get; set; }

    [MinLength(6)]
    public string? Password { get; set; }

    public string? FullName { get; set; }

    public int? CoinBalance { get; set; }

    public int? SubscriptionPackageId { get; set; }
}
