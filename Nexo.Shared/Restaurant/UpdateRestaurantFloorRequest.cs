namespace Nexo.Shared.Restaurant;

public sealed record UpdateRestaurantFloorRequest(
    Guid BranchId,
    string Name,
    int SortOrder,
    bool IsActive);
