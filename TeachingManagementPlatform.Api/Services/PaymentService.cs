using Microsoft.EntityFrameworkCore;
using PayOS;
using PayOS.Models;
using PayOS.Models.V2.PaymentRequests;
using PayOS.Models.Webhooks;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Services;

public class PaymentService : IPaymentService
{
    private readonly ApplicationDbContext _context;
    private readonly ICoinService _coinService;
    private readonly ICoinPackageService _coinPackageService;
    private readonly PayOSClient _payOSClient;

    public PaymentService(
        ApplicationDbContext context,
        ICoinService coinService,
        ICoinPackageService coinPackageService,
        PayOSClient payOSClient)
    {
        _context = context;
        _coinService = coinService;
        _coinPackageService = coinPackageService;
        _payOSClient = payOSClient;
    }

    public async Task<CoinPurchaseCheckoutResponse> CreateCoinPurchaseCheckoutAsync(
        int userId,
        int coinPackageId,
        CreateCoinPurchaseRequest request)
    {
        var package = await _coinPackageService.GetByIdAsync(coinPackageId);
        if (!package.IsActive)
            throw new CoinPurchasePaymentException("Gói ECoin này hiện không khả dụng.");

        var amount = decimal.ToInt32(decimal.Round(package.Price, 0, MidpointRounding.AwayFromZero));
        if (amount <= 0)
            throw new CoinPurchasePaymentException("Giá gói ECoin không hợp lệ.");

        var orderCode = await GenerateUniqueOrderCodeAsync();
        var transaction = new CoinPurchaseTransaction
        {
            OrderCode = orderCode,
            UserId = userId,
            CoinPackageId = package.Id,
            Amount = package.Price,
            CoinAmount = package.CoinAmount,
            Status = "pending",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.CoinPurchaseTransactions.Add(transaction);
        await _context.SaveChangesAsync();

        try
        {
            var paymentRequest = new CreatePaymentLinkRequest
            {
                OrderCode = orderCode,
                Amount = amount,
                Description = BuildDescription(package, orderCode),
                ReturnUrl = EnsureRedirectUrl(request.ReturnUrl, orderCode, "success"),
                CancelUrl = EnsureRedirectUrl(request.CancelUrl, orderCode, "cancel")
            };

            var paymentLink = await _payOSClient.PaymentRequests.CreateAsync(paymentRequest);

            transaction.CheckoutUrl = paymentLink.CheckoutUrl;
            transaction.PaymentLinkId = paymentLink.PaymentLinkId;
            transaction.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new CoinPurchaseCheckoutResponse
            {
                OrderCode = orderCode,
                CheckoutUrl = paymentLink.CheckoutUrl,
                Status = transaction.Status,
                Package = package
            };
        }
        catch (Exception ex)
        {
            transaction.Status = "failed";
            transaction.ErrorMessage = ex.Message;
            transaction.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            throw new CoinPurchasePaymentException("Không thể tạo liên kết thanh toán.", ex);
        }
    }

    public async Task<CoinPurchaseWebhookResult> HandleCoinPurchaseWebhookAsync(Webhook webhook)
    {
        WebhookData verifiedWebhook;
        try
        {
            verifiedWebhook = await _payOSClient.Webhooks.VerifyAsync(webhook);
        }
        catch (Exception ex)
        {
            throw new CoinPurchaseWebhookException("Webhook thanh toán không hợp lệ.", ex);
        }

        var transaction = await _context.CoinPurchaseTransactions
            .Include(item => item.User)
            .FirstOrDefaultAsync(item => item.OrderCode == verifiedWebhook.OrderCode);

        if (transaction == null)
            throw new CoinPurchaseWebhookException($"Không tìm thấy giao dịch cho orderCode {verifiedWebhook.OrderCode}.");

        if (string.Equals(transaction.Status, "paid", StringComparison.OrdinalIgnoreCase))
        {
            return new CoinPurchaseWebhookResult
            {
                OrderCode = transaction.OrderCode,
                Status = transaction.Status,
                CoinAmount = transaction.CoinAmount,
                CoinBalance = transaction.User.CoinBalance
            };
        }

        if (!string.Equals(verifiedWebhook.Code, "00", StringComparison.OrdinalIgnoreCase))
        {
            transaction.Status = "failed";
            transaction.ErrorMessage = verifiedWebhook.Description;
            transaction.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new CoinPurchaseWebhookResult
            {
                OrderCode = transaction.OrderCode,
                Status = transaction.Status,
                CoinAmount = transaction.CoinAmount,
                CoinBalance = transaction.User.CoinBalance
            };
        }

        var coinBalance = await _coinService.AddCoinsAsync(transaction.UserId, transaction.CoinAmount);

        transaction.Status = "paid";
        transaction.PaidAt = DateTime.UtcNow;
        transaction.PaymentLinkId = verifiedWebhook.PaymentLinkId;
        transaction.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new CoinPurchaseWebhookResult
        {
            OrderCode = transaction.OrderCode,
            Status = transaction.Status,
            CoinAmount = transaction.CoinAmount,
            CoinBalance = coinBalance
        };
    }

    private async Task<long> GenerateUniqueOrderCodeAsync()
    {
        while (true)
        {
            var candidate = Random.Shared.NextInt64(1_000_000_000_000L, 9_000_000_000_000_000L);
            var exists = await _context.CoinPurchaseTransactions.AnyAsync(item => item.OrderCode == candidate);
            if (!exists)
                return candidate;
        }
    }

    private static string BuildDescription(CoinPackageResponse package, long orderCode)
    {
        var description = $"ECoin {package.Id}-{orderCode}";
        return description.Length > 25 ? description[..25] : description;
    }

    private static string EnsureRedirectUrl(string? value, long orderCode, string status)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw new CoinPurchasePaymentException("Thiếu URL chuyển hướng cho thanh toán.");

        return AppendQueryString(value, new Dictionary<string, string?>
        {
            ["orderCode"] = orderCode.ToString(),
            ["paymentStatus"] = status
        });
    }

    private static string AppendQueryString(string url, IReadOnlyDictionary<string, string?> query)
    {
        var separator = url.Contains('?') ? "&" : "?";
        var queryString = string.Join("&", query
            .Where(pair => !string.IsNullOrWhiteSpace(pair.Value))
            .Select(pair => $"{Uri.EscapeDataString(pair.Key)}={Uri.EscapeDataString(pair.Value!)}"));

        return string.IsNullOrWhiteSpace(queryString) ? url : $"{url}{separator}{queryString}";
    }
}

public class CoinPurchasePaymentException : Exception
{
    public CoinPurchasePaymentException(string message) : base(message)
    {
    }

    public CoinPurchasePaymentException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}

public class CoinPurchaseWebhookException : Exception
{
    public CoinPurchaseWebhookException(string message) : base(message)
    {
    }

    public CoinPurchaseWebhookException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}