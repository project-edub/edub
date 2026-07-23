using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TeachingManagementPlatform.Api.Data;
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
    private readonly ApplicationDbContext _context;

    public AdminController(ApplicationDbContext context, IAccountService accountService, ISubscriptionService subscriptionService, ICoinPackageService coinPackageService)
    {
        _context = context;
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

    // ── Transaction Endpoints ──

    [HttpGet("transactions")]
    public async Task<IActionResult> GetTransactions(
        [FromQuery] string? filterType,
        [FromQuery] int? day,
        [FromQuery] int? month,
        [FromQuery] int? quarter,
        [FromQuery] int? year,
        [FromQuery] string? search)
    {
        var query = _context.CoinPurchaseTransactions
            .Include(t => t.User)
            .AsNoTracking()
            .AsQueryable();

        // Date filtering
        if (!string.IsNullOrEmpty(filterType) && year.HasValue)
        {
            DateTime startDate;
            DateTime endDate;

            switch (filterType)
            {
                case "day":
                    if (month.HasValue && day.HasValue)
                    {
                        startDate = new DateTime(year.Value, month.Value, day.Value, 0, 0, 0, DateTimeKind.Utc);
                        endDate = startDate.AddDays(1);
                    }
                    else goto default;
                    break;
                case "month":
                    if (month.HasValue)
                    {
                        startDate = new DateTime(year.Value, month.Value, 1, 0, 0, 0, DateTimeKind.Utc);
                        endDate = startDate.AddMonths(1);
                    }
                    else goto default;
                    break;
                case "quarter":
                    if (quarter.HasValue)
                    {
                        var startMonth = (quarter.Value - 1) * 3 + 1;
                        startDate = new DateTime(year.Value, startMonth, 1, 0, 0, 0, DateTimeKind.Utc);
                        endDate = startDate.AddMonths(3);
                    }
                    else goto default;
                    break;
                case "year":
                    startDate = new DateTime(year.Value, 1, 1, 0, 0, 0, DateTimeKind.Utc);
                    endDate = startDate.AddYears(1);
                    break;
                default:
                    startDate = DateTime.UtcNow.Date;
                    endDate = startDate.AddDays(1);
                    break;
            }

            query = query.Where(t => t.CreatedAt >= startDate && t.CreatedAt < endDate);
        }
        else
        {
            // Default: today
            var today = DateTime.UtcNow.Date;
            query = query.Where(t => t.CreatedAt >= today && t.CreatedAt < today.AddDays(1));
        }

        // Search by user name or email
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(t => t.User.Email.ToLower().Contains(s) || t.User.FullName.ToLower().Contains(s));
        }

        var transactions = await query
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new
            {
                t.Id,
                t.OrderCode,
                userName = t.User.FullName,
                userEmail = t.User.Email,
                t.Amount,
                t.CoinAmount,
                t.Status,
                t.SubscriptionPackageId,
                t.PaidAt,
                t.CreatedAt,
            })
            .ToListAsync();

        return Ok(transactions);
    }

    // ── Dashboard Endpoints ──

    [HttpGet("dashboard/general")]
    public async Task<IActionResult> GetDashboardGeneral()
    {
        var totalUsers = await _context.Users.CountAsync(u => u.Role != "Admin");

        // Total storage: sum of file sizes from StorageItems
        var totalStorageBytes = await _context.StorageItems
            .Where(s => s.ItemType == "file")
            .SumAsync(s => (long?)s.FileSize) ?? 0;

        var totalSubscriptionPackages = await _context.SubscriptionPackages.CountAsync();
        var totalCoinPackages = await _context.CoinPackages.CountAsync();
        var totalScoreTemplates = await _context.ScoreTemplates.CountAsync();

        // Additional stats
        var totalQuizGames = await _context.QuizGames.CountAsync();
        var totalCrosswordGames = await _context.CrosswordGames.CountAsync();
        var totalLessonPlans = await _context.LessonPlans.CountAsync();
        var totalClasses = await _context.Classes.CountAsync();
        var totalIncomeAllTime = await _context.CoinPurchaseTransactions
            .Where(t => t.Status.ToLower() == "paid")
            .SumAsync(t => (decimal?)t.Amount) ?? 0;
        var activeSubscribers = await _context.Users
            .CountAsync(u => u.Role != "Admin" && u.SubscriptionPackageId != null && u.SubscriptionExpiresAt > DateTime.UtcNow);

        return Ok(new
        {
            totalUsers,
            totalStorageBytes,
            totalSubscriptionPackages,
            totalCoinPackages,
            totalScoreTemplates,
            totalQuizGames,
            totalCrosswordGames,
            totalLessonPlans,
            totalClasses,
            totalIncomeAllTime,
            activeSubscribers,
        });
    }

    [HttpGet("dashboard/detail")]
    public async Task<IActionResult> GetDashboardDetail(
        [FromQuery] string? filterType,
        [FromQuery] int? day,
        [FromQuery] int? month,
        [FromQuery] int? quarter,
        [FromQuery] int? year)
    {
        var (startDate, endDate) = ResolveFilterDates(filterType, day, month, quarter, year);

        var newUsers = await _context.Users
            .CountAsync(u => u.Role != "Admin" && u.CreatedAt >= startDate && u.CreatedAt < endDate);

        var transactionsQuery = _context.CoinPurchaseTransactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt < endDate);

        var totalTransactions = await transactionsQuery.CountAsync();
        var totalIncome = await transactionsQuery
            .Where(t => t.Status.ToLower() == "paid")
            .SumAsync(t => (decimal?)t.Amount) ?? 0;

        // Subscription packages breakdown (paid only)
        var subscriptionBreakdown = await transactionsQuery
            .Where(t => t.SubscriptionPackageId != null && t.Status.ToLower() == "paid")
            .GroupBy(t => new { t.SubscriptionPackageId, t.Amount })
            .Select(g => new
            {
                packageId = g.Key.SubscriptionPackageId,
                price = g.Key.Amount,
                count = g.Count(),
            })
            .ToListAsync();

        // ECoin packages breakdown (paid only)
        var ecoinBreakdown = await transactionsQuery
            .Where(t => t.CoinPackageId != null && t.Status.ToLower() == "paid")
            .GroupBy(t => new { t.CoinPackageId, t.CoinAmount, t.Amount })
            .Select(g => new
            {
                packageId = g.Key.CoinPackageId,
                coinAmount = g.Key.CoinAmount,
                price = g.Key.Amount,
                count = g.Count(),
            })
            .ToListAsync();

        return Ok(new
        {
            startDate = startDate.ToString("o"),
            endDate = endDate.ToString("o"),
            newUsers,
            totalTransactions,
            totalIncome,
            subscriptionBreakdown,
            ecoinBreakdown,
        });
    }

    [HttpGet("dashboard/chart")]
    public async Task<IActionResult> GetDashboardChart(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? groupBy)
    {
        var startDate = from?.ToUniversalTime() ?? DateTime.UtcNow.Date.AddDays(-30);
        var endDate = to?.ToUniversalTime() ?? DateTime.UtcNow.Date.AddDays(1);
        var unit = groupBy ?? "day";

        // Get all paid transactions in range
        var transactions = await _context.CoinPurchaseTransactions
            .Where(t => t.CreatedAt >= startDate && t.CreatedAt < endDate && t.Status.ToLower() == "paid")
            .Select(t => new { t.CreatedAt, t.Amount })
            .ToListAsync();

        // Get new users in range
        var newUsers = await _context.Users
            .Where(u => u.Role != "Admin" && u.CreatedAt >= startDate && u.CreatedAt < endDate)
            .Select(u => new { u.CreatedAt })
            .ToListAsync();

        // Group by unit
        var transactionPoints = GroupByUnit(transactions.Select(t => (t.CreatedAt, t.Amount)), unit);
        var userPoints = GroupByUnit(newUsers.Select(u => (u.CreatedAt, Amount: 1m)), unit);

        return Ok(new
        {
            unit,
            startDate = startDate.ToString("o"),
            endDate = endDate.ToString("o"),
            income = transactionPoints.Select(p => new { date = p.Key, value = p.Value }),
            transactions = GroupByUnitCount(transactions.Select(t => t.CreatedAt), unit).Select(p => new { date = p.Key, value = p.Value }),
            newUsers = userPoints.Select(p => new { date = p.Key, value = (int)p.Value }),
        });
    }

    private static Dictionary<string, decimal> GroupByUnit(IEnumerable<(DateTime Date, decimal Amount)> items, string unit)
    {
        return unit switch
        {
            "week" => items.GroupBy(i => $"{ISOWeekYear(i.Date)}-W{ISOWeek(i.Date):D2}")
                .ToDictionary(g => g.Key, g => g.Sum(x => x.Amount)),
            "month" => items.GroupBy(i => i.Date.ToString("yyyy-MM"))
                .ToDictionary(g => g.Key, g => g.Sum(x => x.Amount)),
            "quarter" => items.GroupBy(i => $"{i.Date.Year}-Q{(i.Date.Month - 1) / 3 + 1}")
                .ToDictionary(g => g.Key, g => g.Sum(x => x.Amount)),
            _ => items.GroupBy(i => i.Date.ToString("yyyy-MM-dd"))
                .ToDictionary(g => g.Key, g => g.Sum(x => x.Amount)),
        };
    }

    private static Dictionary<string, int> GroupByUnitCount(IEnumerable<DateTime> items, string unit)
    {
        return unit switch
        {
            "week" => items.GroupBy(d => $"{ISOWeekYear(d)}-W{ISOWeek(d):D2}")
                .ToDictionary(g => g.Key, g => g.Count()),
            "month" => items.GroupBy(d => d.ToString("yyyy-MM"))
                .ToDictionary(g => g.Key, g => g.Count()),
            "quarter" => items.GroupBy(d => $"{d.Year}-Q{(d.Month - 1) / 3 + 1}")
                .ToDictionary(g => g.Key, g => g.Count()),
            _ => items.GroupBy(d => d.ToString("yyyy-MM-dd"))
                .ToDictionary(g => g.Key, g => g.Count()),
        };
    }

    private static int ISOWeek(DateTime date) => System.Globalization.ISOWeek.GetWeekOfYear(date);
    private static int ISOWeekYear(DateTime date) => System.Globalization.ISOWeek.GetYear(date);

    private static (DateTime startDate, DateTime endDate) ResolveFilterDates(
        string? filterType, int? day, int? month, int? quarter, int? year)
    {
        if (string.IsNullOrEmpty(filterType) || !year.HasValue)
        {
            var today = DateTime.UtcNow.Date;
            return (today, today.AddDays(1));
        }

        return filterType switch
        {
            "day" when month.HasValue && day.HasValue =>
                (new DateTime(year.Value, month.Value, day.Value, 0, 0, 0, DateTimeKind.Utc),
                 new DateTime(year.Value, month.Value, day.Value, 0, 0, 0, DateTimeKind.Utc).AddDays(1)),
            "month" when month.HasValue =>
                (new DateTime(year.Value, month.Value, 1, 0, 0, 0, DateTimeKind.Utc),
                 new DateTime(year.Value, month.Value, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(1)),
            "quarter" when quarter.HasValue =>
                (new DateTime(year.Value, (quarter.Value - 1) * 3 + 1, 1, 0, 0, 0, DateTimeKind.Utc),
                 new DateTime(year.Value, (quarter.Value - 1) * 3 + 1, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(3)),
            "year" =>
                (new DateTime(year.Value, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                 new DateTime(year.Value, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddYears(1)),
            _ => (DateTime.UtcNow.Date, DateTime.UtcNow.Date.AddDays(1)),
        };
    }

    // ── Game ECoin Config Endpoints ──

    private static readonly string EcoinConfigPath = Path.Combine(AppContext.BaseDirectory, "game-ecoin-config.json");

    [HttpGet("game-ecoin-config")]
    public IActionResult GetGameEcoinConfig()
    {
        if (!System.IO.File.Exists(EcoinConfigPath))
        {
            // Return default config
            return Ok(new
            {
                crosswordBaseRates = new[]
                {
                    new { minWords = 5, maxWords = 10, baseCost = 5 },
                    new { minWords = 11, maxWords = 15, baseCost = 8 },
                    new { minWords = 16, maxWords = 20, baseCost = 10 },
                    new { minWords = 21, maxWords = 25, baseCost = 12 },
                    new { minWords = 26, maxWords = 30, baseCost = 15 },
                },
                crosswordClueStyleRates = new Dictionary<string, int>
                {
                    ["definition"] = 0,
                    ["fill-in-blank"] = 3,
                    ["multiple-choice"] = 5,
                },
                crosswordLanguageRates = new Dictionary<string, int>
                {
                    ["vi"] = 0,
                    ["en"] = 2,
                },
                crosswordRegenerateMultiplier = 0.5,
                quizCoinCostPerQuestion = 1,
                upgradeDiscountPercent = 20,
                freeEcoinOnRegister = 10,
                freeEcoinMaxPerAccount = 50,
                freeEcoinDailyTopUp = 5,
                subscriptionDurationDays = 30,
            });
        }

        var json = System.IO.File.ReadAllText(EcoinConfigPath);
        return Content(json, "application/json");
    }

    [HttpPut("game-ecoin-config")]
    public IActionResult SaveGameEcoinConfig([FromBody] System.Text.Json.JsonElement config)
    {
        try
        {
            var json = config.GetRawText();
            System.IO.File.WriteAllText(EcoinConfigPath, json);
            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = new { code = "SAVE_FAILED", message = ex.Message } });
        }
    }
}
