using TeachingManagementPlatform.Api.Models;

namespace TeachingManagementPlatform.Api.Interfaces;

public interface IAccountService
{
    Task<List<AccountResponse>> GetAllAsync();
    Task<AccountResponse> GetByIdAsync(int id);
    Task<AccountResponse> CreateAsync(CreateAccountRequest request);
    Task<AccountResponse> UpdateAsync(int id, UpdateAccountRequest request);
    Task DeleteAsync(int id);
    Task<AccountResponse> UpdateStatusAsync(int id, UpdateAccountStatusRequest request);
}
