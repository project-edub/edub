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
}