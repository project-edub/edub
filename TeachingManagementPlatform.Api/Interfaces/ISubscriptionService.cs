using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface ISubscriptionService
{
    Task<List<SubscriptionPackageResponse>> GetAllAsync();
    Task<SubscriptionPackageResponse> GetByIdAsync(int id);
    Task<SubscriptionPackageResponse> CreateAsync(CreateSubscriptionPackageRequest request);
    Task<SubscriptionPackageResponse> UpdateAsync(int id, UpdateSubscriptionPackageRequest request);
    Task DeleteAsync(int id);
}
