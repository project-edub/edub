using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PayOS.Models.Webhooks;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;

    public PaymentsController(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    [AllowAnonymous]
    [HttpPost("payos/webhook")]
    public async Task<IActionResult> PayOsWebhook([FromBody] Webhook webhook)
    {
        try
        {
            var result = await _paymentService.HandleCoinPurchaseWebhookAsync(webhook);
            return Ok(result);
        }
        catch (CoinPurchaseWebhookException ex)
        {
            return BadRequest(new { error = new { code = "PAYMENT_WEBHOOK_INVALID", message = ex.Message } });
        }
    }
}