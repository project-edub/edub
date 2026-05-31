using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface ICoinPackageService
{
    Task<List<CoinPackageResponse>> GetAllAsync(bool onlyActive = false);
    Task<CoinPackageResponse> GetByIdAsync(int id);
    Task<CoinPackageResponse> CreateAsync(CreateCoinPackageRequest request);
    Task<CoinPackageResponse> UpdateAsync(int id, UpdateCoinPackageRequest request);
    Task DeleteAsync(int id);
}