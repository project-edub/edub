using Microsoft.EntityFrameworkCore;
using PayOS;
using PayOS.Models;
using PayOS.Models.V2.PaymentRequests;
using PayOS.Models.Webhooks;
using TeachingManagementPlatform.Api.Data;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using System.Reflection;

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

        if (!IsWebhookPaymentSuccessful(verifiedWebhook))
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

    public async Task<CoinPurchaseWebhookResult> SyncCoinPurchaseStatusAsync(int userId, long orderCode)
    {
        var transaction = await _context.CoinPurchaseTransactions
            .Include(item => item.User)
            .FirstOrDefaultAsync(item => item.OrderCode == orderCode && item.UserId == userId);

        if (transaction == null)
            throw new CoinPurchaseNotFoundException($"Không tìm thấy giao dịch orderCode {orderCode}.");

        if (string.Equals(transaction.Status, "paid", StringComparison.OrdinalIgnoreCase))
            return BuildResult(transaction, transaction.User.CoinBalance);

        PayOS.Models.V2.PaymentRequests.PaymentLink paymentLink;
        try
        {
            paymentLink = await _payOSClient.PaymentRequests.GetAsync(orderCode);
        }
        catch (Exception ex)
        {
            throw new CoinPurchasePaymentException("Không thể đồng bộ trạng thái thanh toán từ PayOS.", ex);
        }

        if (IsPaymentLinkPaid(paymentLink))
        {
            // If this is a subscription transaction, delegate to the subscription sync
            if (transaction.SubscriptionPackageId.HasValue)
            {
                return await SyncSubscriptionPurchaseAsync(userId, orderCode);
            }

            var coinBalance = await _coinService.AddCoinsAsync(transaction.UserId, transaction.CoinAmount);

            transaction.Status = "paid";
            transaction.PaidAt = DateTime.UtcNow;
            transaction.PaymentLinkId = ExtractPaymentLinkId(paymentLink) ?? transaction.PaymentLinkId;
            transaction.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return BuildResult(transaction, coinBalance);
        }

        if (IsPaymentLinkFailed(paymentLink))
        {
            transaction.Status = "failed";
            transaction.ErrorMessage = "Giao dịch PayOS không thành công.";
            transaction.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return BuildResult(transaction, transaction.User.CoinBalance);
    }

    public async Task<CoinPurchaseWebhookResult?> SyncLatestCoinPurchaseAsync(int userId)
    {
        var candidate = await _context.CoinPurchaseTransactions
            .AsNoTracking()
            .Where(item => item.UserId == userId)
            .Where(item => item.SubscriptionPackageId == null) // Only coin purchases, not subscriptions
            .Where(item => !string.Equals(item.Status, "paid", StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(item => item.CreatedAt)
            .FirstOrDefaultAsync();

        if (candidate == null)
            return null;

        return await SyncCoinPurchaseStatusAsync(userId, candidate.OrderCode);
    }

    public async Task<CoinPurchaseWebhookResult?> SyncLatestSubscriptionPurchaseAsync(int userId)
    {
        var candidate = await _context.CoinPurchaseTransactions
            .AsNoTracking()
            .Where(item => item.UserId == userId)
            .Where(item => item.SubscriptionPackageId != null)
            .Where(item => !string.Equals(item.Status, "paid", StringComparison.OrdinalIgnoreCase))
            .OrderByDescending(item => item.CreatedAt)
            .FirstOrDefaultAsync();

        if (candidate == null)
            return null;

        return await SyncSubscriptionPurchaseAsync(userId, candidate.OrderCode);
    }

    public async Task<List<CoinPurchaseHistoryItem>> GetPurchaseHistoryAsync(int userId)
    {
        return await _context.CoinPurchaseTransactions
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new CoinPurchaseHistoryItem
            {
                Id = t.Id,
                OrderCode = t.OrderCode,
                Amount = t.Amount,
                CoinAmount = t.CoinAmount,
                Status = t.Status,
                CreatedAt = t.CreatedAt,
                PaidAt = t.PaidAt
            })
            .ToListAsync();
    }

    public async Task<CoinPurchaseCheckoutResponse> CreateSubscriptionPurchaseCheckoutAsync(
        int userId,
        int subscriptionPackageId,
        CreateCoinPurchaseRequest request)
    {
        var subPkg = await _context.SubscriptionPackages.FindAsync(subscriptionPackageId);
        if (subPkg == null || !subPkg.IsActive)
            throw new CoinPurchasePaymentException("Gói đăng ký này hiện không khả dụng.");

        var amount = decimal.ToInt32(decimal.Round(subPkg.Price, 0, MidpointRounding.AwayFromZero));
        if (amount <= 0)
            throw new CoinPurchasePaymentException("Gói miễn phí không cần thanh toán.");

        var orderCode = await GenerateUniqueOrderCodeAsync();

        // Use CoinPackageId = null to indicate this is NOT a coin purchase
        var transaction = new CoinPurchaseTransaction
        {
            OrderCode = orderCode,
            UserId = userId,
            CoinPackageId = null,
            Amount = subPkg.Price,
            CoinAmount = 0,
            Status = "pending",
            SubscriptionPackageId = subscriptionPackageId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.CoinPurchaseTransactions.Add(transaction);
        await _context.SaveChangesAsync();

        try
        {
            var description = $"Sub {subPkg.Id}-{orderCode}";
            if (description.Length > 25) description = description[..25];

            var paymentRequest = new CreatePaymentLinkRequest
            {
                OrderCode = orderCode,
                Amount = amount,
                Description = description,
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
                Package = new CoinPackageResponse
                {
                    Id = subPkg.Id,
                    Name = subPkg.Name,
                    Price = subPkg.Price,
                    CoinAmount = 0,
                    IsActive = subPkg.IsActive
                }
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

    public async Task<CoinPurchaseWebhookResult> SyncSubscriptionPurchaseAsync(int userId, long orderCode)
    {
        var transaction = await _context.CoinPurchaseTransactions
            .FirstOrDefaultAsync(t => t.OrderCode == orderCode && t.UserId == userId);

        if (transaction == null)
            throw new CoinPurchasePaymentException("Không tìm thấy giao dịch.");

        if (transaction.Status == "paid")
        {
            var user2 = await _context.Users.FindAsync(userId);
            return BuildResult(transaction, user2?.CoinBalance ?? 0);
        }

        // Try to get payment status from PayOS
        try
        {
            var paymentLink = await _payOSClient.PaymentRequests.GetAsync(orderCode);

            if (IsPaymentLinkPaid(paymentLink))
            {
                transaction.Status = "paid";
                transaction.PaidAt = DateTime.UtcNow;
                transaction.UpdatedAt = DateTime.UtcNow;

                // Update user's subscription package
                var user = await _context.Users.FindAsync(userId);
                if (user != null && transaction.SubscriptionPackageId.HasValue)
                {
                    user.SubscriptionPackageId = transaction.SubscriptionPackageId.Value;
                    user.SubscriptionExpiresAt = DateTime.UtcNow.AddDays(30);
                    user.UpdatedAt = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();
                return BuildResult(transaction, user?.CoinBalance ?? 0);
            }

            if (IsPaymentLinkFailed(paymentLink))
            {
                transaction.Status = "failed";
                transaction.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }
        }
        catch
        {
            // Ignore sync errors
        }

        var currentUser = await _context.Users.FindAsync(userId);
        return BuildResult(transaction, currentUser?.CoinBalance ?? 0);
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

    private static CoinPurchaseWebhookResult BuildResult(CoinPurchaseTransaction transaction, int coinBalance)
    {
        return new CoinPurchaseWebhookResult
        {
            OrderCode = transaction.OrderCode,
            Status = transaction.Status,
            CoinAmount = transaction.CoinAmount,
            CoinBalance = coinBalance
        };
    }

    private static bool IsWebhookPaymentSuccessful(WebhookData webhookData)
    {
        return string.Equals(webhookData.Code, "00", StringComparison.OrdinalIgnoreCase)
            || IsSuccessfulStatusName(GetPropertyValue(webhookData, "Code")?.ToString())
            || ContainsVietnameseSuccessText(GetPropertyValue(webhookData, "Description2")?.ToString());
    }

    private static bool IsPaymentLinkPaid(object paymentLink)
    {
        var status = GetPropertyValue(paymentLink, "Status")?.ToString();
        if (IsSuccessfulStatusName(status))
            return true;

        if (GetPropertyValue(paymentLink, "Paid") is bool paid && paid)
            return true;

        if (GetPropertyValue(paymentLink, "IsPaid") is bool isPaid && isPaid)
            return true;

        return false;
    }

    private static bool IsPaymentLinkFailed(object paymentLink)
    {
        var status = GetPropertyValue(paymentLink, "Status")?.ToString();
        if (string.IsNullOrWhiteSpace(status))
            return false;

        return status.Contains("cancel", StringComparison.OrdinalIgnoreCase)
            || status.Contains("failed", StringComparison.OrdinalIgnoreCase)
            || status.Contains("expired", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsSuccessfulStatusName(string? status)
    {
        if (string.IsNullOrWhiteSpace(status))
            return false;

        return status.Contains("00", StringComparison.OrdinalIgnoreCase)
            || status.Contains("paid", StringComparison.OrdinalIgnoreCase)
            || status.Contains("success", StringComparison.OrdinalIgnoreCase)
            || status.Contains("completed", StringComparison.OrdinalIgnoreCase);
    }

    private static bool ContainsVietnameseSuccessText(string? description)
    {
        if (string.IsNullOrWhiteSpace(description))
            return false;

        return description.Contains("thanh cong", StringComparison.OrdinalIgnoreCase)
            || description.Contains("thành công", StringComparison.OrdinalIgnoreCase);
    }

    private static string? ExtractPaymentLinkId(object paymentLink)
    {
        return GetPropertyValue(paymentLink, "PaymentLinkId")?.ToString()
            ?? GetPropertyValue(paymentLink, "Id")?.ToString();
    }

    private static object? GetPropertyValue(object source, string propertyName)
    {
        return source.GetType().GetProperty(propertyName, BindingFlags.Public | BindingFlags.Instance)?.GetValue(source);
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

public class CoinPurchaseNotFoundException : Exception
{
    public CoinPurchaseNotFoundException(string message) : base(message)
    {
    }
}