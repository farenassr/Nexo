namespace Nexo.Shared.Restaurant;

public sealed record CreateRestaurantFloorPlanRequest(
    Guid BranchId,
    Guid FloorId,
    string Name,
    decimal CanvasWidth,
    decimal CanvasHeight,
    decimal? GridSize,
    bool IsActive);
