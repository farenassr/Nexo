namespace Nexo.Shared.Restaurant;

public sealed record RestaurantTableLayoutDetail(
    Guid TableId,
    string TableLabel,
    Guid? AreaId,
    decimal X,
    decimal Y,
    decimal Width,
    decimal Height,
    decimal RotationDegrees,
    RestaurantTableShape Shape,
    int ZIndex,
    IReadOnlyCollection<RestaurantTableSeatLayoutDetail> SeatLayouts);
