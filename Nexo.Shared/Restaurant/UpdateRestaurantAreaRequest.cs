namespace Nexo.Shared.Restaurant;

public sealed record UpdateRestaurantAreaRequest(
    Guid BranchId,
    Guid FloorId,
    string Name,
    RestaurantAreaType Type,
    int SortOrder,
    bool IsActive);
