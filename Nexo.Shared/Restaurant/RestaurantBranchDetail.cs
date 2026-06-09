namespace Nexo.Shared.Restaurant;

public sealed record RestaurantBranchDetail(
    Guid Id,
    Guid CompanyId,
    string Name,
    string? Address,
    string TimeZone,
    bool IsActive);
