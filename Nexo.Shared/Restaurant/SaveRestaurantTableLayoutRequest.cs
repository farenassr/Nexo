namespace Nexo.Shared.Restaurant;

public sealed record SaveRestaurantTableLayoutRequest(
    Guid TableId,
    decimal X,
    decimal Y,
    decimal Width,
    decimal Height,
    decimal RotationDegrees,
    RestaurantTableShape Shape,
    int ZIndex,
    IReadOnlyCollection<SaveRestaurantTableSeatLayoutRequest> SeatLayouts);
