using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly IAccountService _accountService;
    private readonly ISubscriptionService _subscriptionService;
    private readonly ICoinPackageService _coinPackageService;

    public AdminController(IAccountService accountService, ISubscriptionService subscriptionService, ICoinPackageService coinPackageService)
    {
        _accountService = accountService;
        _subscriptionService = subscriptionService;
        _coinPackageService = coinPackageService;
    }

    [HttpGet("accounts")]
    public async Task<IActionResult> GetAllAccounts()
    {
        var accounts = await _accountService.GetAllAsync();
        return Ok(accounts);
    }

    [HttpGet("accounts/{id}")]
    public async Task<IActionResult> GetAccount(int id)
    {
        try
        {
            var account = await _accountService.GetByIdAsync(id);
            return Ok(account);
        }
        catch (AccountNotFoundException ex)
        {
            return NotFound(new { error = new { code = "ACCOUNT_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPost("accounts")]
    public async Task<IActionResult> CreateAccount([FromBody] CreateAccountRequest request)
    {
        try
        {
            var account = await _accountService.CreateAsync(request);
            return CreatedAtAction(nameof(GetAccount), new { id = account.Id }, account);
        }
        catch (EmailAlreadyExistsException ex)
        {
            return BadRequest(new { error = new { code = "EMAIL_EXISTS", message = ex.Message } });
        }
    }

    [HttpPut("accounts/{id}")]
    public async Task<IActionResult> UpdateAccount(int id, [FromBody] UpdateAccountRequest request)
    {
        try
        {
            var account = await _accountService.UpdateAsync(id, request);
            return Ok(account);
        }
        catch (AccountNotFoundException ex)
        {
            return NotFound(new { error = new { code = "ACCOUNT_NOT_FOUND", message = ex.Message } });
        }
        catch (EmailAlreadyExistsException ex)
        {
            return BadRequest(new { error = new { code = "EMAIL_EXISTS", message = ex.Message } });
        }
    }

    [HttpDelete("accounts/{id}")]
    public async Task<IActionResult> DeleteAccount(int id)
    {
        try
        {
            await _accountService.DeleteAsync(id);
            return NoContent();
        }
        catch (AccountNotFoundException ex)
        {
            return NotFound(new { error = new { code = "ACCOUNT_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPatch("accounts/{id}/status")]
    public async Task<IActionResult> UpdateAccountStatus(int id, [FromBody] UpdateAccountStatusRequest request)
    {
        try
        {
            var account = await _accountService.UpdateStatusAsync(id, request);
            return Ok(account);
        }
        catch (AccountNotFoundException ex)
        {
            return NotFound(new { error = new { code = "ACCOUNT_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPatch("accounts/{id}/coin-balance")]
    public async Task<IActionResult> UpdateAccountCoinBalance(int id, [FromBody] UpdateAccountRequest request)
    {
        try
        {
            var account = await _accountService.UpdateAsync(id, request);
            return Ok(account);
        }
        catch (AccountNotFoundException ex)
        {
            return NotFound(new { error = new { code = "ACCOUNT_NOT_FOUND", message = ex.Message } });
        }
        catch (EmailAlreadyExistsException ex)
        {
            return BadRequest(new { error = new { code = "EMAIL_EXISTS", message = ex.Message } });
        }
    }

    // ── Subscription Package Endpoints ──

    [HttpGet("subscriptions")]
    public async Task<IActionResult> GetAllSubscriptions()
    {
        var packages = await _subscriptionService.GetAllAsync();
        return Ok(packages);
    }

    [HttpGet("subscriptions/{id}")]
    public async Task<IActionResult> GetSubscription(int id)
    {
        try
        {
            var package = await _subscriptionService.GetByIdAsync(id);
            return Ok(package);
        }
        catch (SubscriptionPackageNotFoundException ex)
        {
            return NotFound(new { error = new { code = "SUBSCRIPTION_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPost("subscriptions")]
    public async Task<IActionResult> CreateSubscription([FromBody] CreateSubscriptionPackageRequest request)
    {
        try
        {
            var package = await _subscriptionService.CreateAsync(request);
            return CreatedAtAction(nameof(GetSubscription), new { id = package.Id }, package);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = new { code = "VALIDATION_ERROR", message = ex.Message, details = ex.Errors } });
        }
    }

    [HttpPut("subscriptions/{id}")]
    public async Task<IActionResult> UpdateSubscription(int id, [FromBody] UpdateSubscriptionPackageRequest request)
    {
        try
        {
            var package = await _subscriptionService.UpdateAsync(id, request);
            return Ok(package);
        }
        catch (SubscriptionPackageNotFoundException ex)
        {
            return NotFound(new { error = new { code = "SUBSCRIPTION_NOT_FOUND", message = ex.Message } });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = new { code = "VALIDATION_ERROR", message = ex.Message, details = ex.Errors } });
        }
    }

    [HttpDelete("subscriptions/{id}")]
    public async Task<IActionResult> DeleteSubscription(int id)
    {
        try
        {
            await _subscriptionService.DeleteAsync(id);
            return NoContent();
        }
        catch (SubscriptionPackageNotFoundException ex)
        {
            return NotFound(new { error = new { code = "SUBSCRIPTION_NOT_FOUND", message = ex.Message } });
        }
    }

    // ── Coin Package Endpoints ──

    [HttpGet("coin-packages")]
    public async Task<IActionResult> GetAllCoinPackages()
    {
        var packages = await _coinPackageService.GetAllAsync();
        return Ok(packages);
    }

    [HttpGet("coin-packages/{id}")]
    public async Task<IActionResult> GetCoinPackage(int id)
    {
        try
        {
            var package = await _coinPackageService.GetByIdAsync(id);
            return Ok(package);
        }
        catch (CoinPackageNotFoundException ex)
        {
            return NotFound(new { error = new { code = "COIN_PACKAGE_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPost("coin-packages")]
    public async Task<IActionResult> CreateCoinPackage([FromBody] CreateCoinPackageRequest request)
    {
        try
        {
            var package = await _coinPackageService.CreateAsync(request);
            return CreatedAtAction(nameof(GetCoinPackage), new { id = package.Id }, package);
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = new { code = "VALIDATION_ERROR", message = ex.Message, details = ex.Errors } });
        }
    }

    [HttpPut("coin-packages/{id}")]
    public async Task<IActionResult> UpdateCoinPackage(int id, [FromBody] UpdateCoinPackageRequest request)
    {
        try
        {
            var package = await _coinPackageService.UpdateAsync(id, request);
            return Ok(package);
        }
        catch (CoinPackageNotFoundException ex)
        {
            return NotFound(new { error = new { code = "COIN_PACKAGE_NOT_FOUND", message = ex.Message } });
        }
        catch (ValidationException ex)
        {
            return BadRequest(new { error = new { code = "VALIDATION_ERROR", message = ex.Message, details = ex.Errors } });
        }
    }

    [HttpDelete("coin-packages/{id}")]
    public async Task<IActionResult> DeleteCoinPackage(int id)
    {
        try
        {
            await _coinPackageService.DeleteAsync(id);
            return NoContent();
        }
        catch (CoinPackageNotFoundException ex)
        {
            return NotFound(new { error = new { code = "COIN_PACKAGE_NOT_FOUND", message = ex.Message } });
        }
    }
}
