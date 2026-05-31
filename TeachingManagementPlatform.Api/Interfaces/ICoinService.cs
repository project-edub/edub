using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface ICoinService
{
    Task<int> GetBalanceAsync(int userId);
    Task<CoinWalletResponse> GetWalletAsync(int userId);
    Task<int> AddCoinsAsync(int userId, int amount);
    Task<int> DeductCoinsAsync(int userId, int amount);
}