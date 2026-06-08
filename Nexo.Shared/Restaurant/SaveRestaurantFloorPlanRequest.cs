namespace Nexo.Shared.Restaurant;

public sealed record SaveRestaurantFloorPlanRequest(
    string Name,
    decimal CanvasWidth,
    decimal CanvasHeight,
    decimal? GridSize,
    bool IsActive,
    IReadOnlyCollection<SaveRestaurantAreaLayoutRequest> AreaLayouts,
    IReadOnlyCollection<SaveRestaurantTableLayoutRequest> TableLayouts);
