namespace Nexo.Shared.Restaurant;

public sealed record CreateRestaurantAreaRequest(
    Guid BranchId,
    Guid FloorId,
    string Name,
    RestaurantAreaType Type,
    int SortOrder);
