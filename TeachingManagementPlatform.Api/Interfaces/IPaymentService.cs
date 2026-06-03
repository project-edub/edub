using PayOS.Models.Webhooks;
using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface IPaymentService
{
    Task<CoinPurchaseCheckoutResponse> CreateCoinPurchaseCheckoutAsync(
        int userId,
        int coinPackageId,
        CreateCoinPurchaseRequest request);

    Task<CoinPurchaseWebhookResult> HandleCoinPurchaseWebhookAsync(Webhook webhook);

    Task<CoinPurchaseWebhookResult> SyncCoinPurchaseStatusAsync(int userId, long orderCode);

    Task<CoinPurchaseWebhookResult?> SyncLatestCoinPurchaseAsync(int userId);

    Task<List<CoinPurchaseHistoryItem>> GetPurchaseHistoryAsync(int userId);

    Task<CoinPurchaseCheckoutResponse> CreateSubscriptionPurchaseCheckoutAsync(
        int userId,
        int subscriptionPackageId,
        CreateCoinPurchaseRequest request);

    Task<CoinPurchaseWebhookResult> SyncSubscriptionPurchaseAsync(int userId, long orderCode);
}