namespace Nexo.Shared.Restaurant;

public sealed record RestaurantFloorDetail(
    Guid Id,
    Guid BranchId,
    string Name,
    int SortOrder,
    bool IsActive);
