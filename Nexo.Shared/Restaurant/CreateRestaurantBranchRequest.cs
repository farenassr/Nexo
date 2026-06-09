namespace Nexo.Shared.Restaurant;

public sealed record CreateRestaurantBranchRequest(
    string Name,
    string? Address,
    string TimeZone);
