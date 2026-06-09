namespace Nexo.Shared.Restaurant;

public sealed record CreateRestaurantFloorRequest(
    Guid BranchId,
    string Name,
    int SortOrder);
