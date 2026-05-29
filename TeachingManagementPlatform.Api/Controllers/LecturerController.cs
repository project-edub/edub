using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TeachingManagementPlatform.Api.Interfaces;
using TeachingManagementPlatform.Api.Models;
using TeachingManagementPlatform.Api.Services;

namespace TeachingManagementPlatform.Api.Controllers;

[ApiController]
[Route("api/lecturer")]
[Authorize(Roles = "Lecturer")]
public class LecturerController : ControllerBase
{
    private readonly IProfileService _profileService;
    private readonly IFileStorage _fileStorage;
    private readonly ICoinService _coinService;
    private readonly ICoinPackageService _coinPackageService;
    private readonly IPaymentService _paymentService;

    public LecturerController(
        IProfileService profileService,
        IFileStorage fileStorage,
        ICoinService coinService,
        ICoinPackageService coinPackageService,
        IPaymentService paymentService)
    {
        _profileService = profileService;
        _fileStorage = fileStorage;
        _coinService = coinService;
        _coinPackageService = coinPackageService;
        _paymentService = paymentService;
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = GetUserId();
        try
        {
            var profile = await _profileService.GetProfileAsync(userId);
            return Ok(profile);
        }
        catch (UserNotFoundException ex)
        {
            return NotFound(new { error = new { code = "USER_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = GetUserId();
        try
        {
            var profile = await _profileService.UpdateProfileAsync(userId, request);
            return Ok(profile);
        }
        catch (UserNotFoundException ex)
        {
            return NotFound(new { error = new { code = "USER_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpPost("profile/upload-image")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadProfileImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = new { code = "NO_FILE", message = "Vui lòng chọn tệp." } });

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType))
            return BadRequest(new { error = new { code = "INVALID_TYPE", message = "Chỉ chấp nhận ảnh JPEG, PNG, GIF, WEBP." } });

        using var stream = file.OpenReadStream();
        var fileRef = await _fileStorage.SaveFileAsync(stream, file.FileName);
        var imageUrl = $"/uploads/{fileRef}";
        return Ok(new { imageUrl });
    }

    [HttpPost("profile/avatar")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadAvatar(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { error = new { code = "NO_FILE", message = "Vui lòng chọn tệp." } });

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType))
            return BadRequest(new { error = new { code = "INVALID_TYPE", message = "Chỉ chấp nhận ảnh JPEG, PNG, GIF, WEBP." } });

        var userId = GetUserId();
        using var stream = file.OpenReadStream();
        var fileRef = await _fileStorage.SaveFileAsync(stream, file.FileName);
        var avatarUrl = $"/uploads/{fileRef}";

        try
        {
            await _profileService.UpdateAvatarAsync(userId, avatarUrl);
            return Ok(new { avatarUrl });
        }
        catch (UserNotFoundException ex)
        {
            return NotFound(new { error = new { code = "USER_NOT_FOUND", message = ex.Message } });
        }
    }

    [HttpGet("coin-wallet")]
    public async Task<IActionResult> GetCoinWallet()
    {
        var userId = GetUserId();
        var wallet = await _coinService.GetWalletAsync(userId);
        return Ok(wallet);
    }

    [HttpGet("coin-packages")]
    public async Task<IActionResult> GetCoinPackages()
    {
        var packages = await _coinPackageService.GetAllAsync(onlyActive: true);
        return Ok(packages);
    }

    [HttpPost("coin-packages/{id}/purchase")]
    public async Task<IActionResult> PurchaseCoinPackage(int id, [FromBody] CreateCoinPurchaseRequest request)
    {
        var userId = GetUserId();

        try
        {
            var checkout = await _paymentService.CreateCoinPurchaseCheckoutAsync(userId, id, request);
            return Ok(checkout);
        }
        catch (CoinPackageNotFoundException ex)
        {
            return NotFound(new { error = new { code = "COIN_PACKAGE_NOT_FOUND", message = ex.Message } });
        }
        catch (CoinPurchasePaymentException ex)
        {
            return BadRequest(new { error = new { code = "PAYMENT_ERROR", message = ex.Message } });
        }
    }

    private int GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? throw new UnauthorizedAccessException("User ID not found in token.");
        return int.Parse(userIdClaim);
    }
}
