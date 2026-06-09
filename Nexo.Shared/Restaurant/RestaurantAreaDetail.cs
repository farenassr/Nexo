namespace Nexo.Shared.Restaurant;

public sealed record RestaurantAreaDetail(
    Guid Id,
    Guid BranchId,
    Guid FloorId,
    string Name,
    RestaurantAreaType Type,
    int SortOrder,
    bool IsActive);
