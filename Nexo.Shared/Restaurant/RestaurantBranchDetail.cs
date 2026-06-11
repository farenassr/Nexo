namespace Nexo.Shared.Restaurant;

public sealed record RestaurantBranchDetail(
    Guid Id,
    Guid OrganizationId,
    string Name,
    string? Address,
    string TimeZone,
    bool IsActive);
