namespace Nexo.Shared.Restaurant;

public sealed record UpdateRestaurantBranchRequest(
    string Name,
    string? Address,
    string TimeZone,
    bool IsActive);
