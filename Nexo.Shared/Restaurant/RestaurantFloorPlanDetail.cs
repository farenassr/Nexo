namespace Nexo.Shared.Restaurant;

public sealed record RestaurantFloorPlanDetail(
    Guid Id,
    Guid BranchId,
    Guid FloorId,
    string Name,
    decimal CanvasWidth,
    decimal CanvasHeight,
    decimal? GridSize,
    bool IsActive,
    IReadOnlyCollection<RestaurantAreaLayoutDetail> AreaLayouts,
    IReadOnlyCollection<RestaurantTableLayoutDetail> TableLayouts);
