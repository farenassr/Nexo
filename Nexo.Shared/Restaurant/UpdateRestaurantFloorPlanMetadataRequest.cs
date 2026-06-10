namespace Nexo.Shared.Restaurant;

public sealed record UpdateRestaurantFloorPlanMetadataRequest(
    Guid BranchId,
    Guid FloorId,
    string Name,
    decimal CanvasWidth,
    decimal CanvasHeight,
    decimal? GridSize,
    bool IsActive);
