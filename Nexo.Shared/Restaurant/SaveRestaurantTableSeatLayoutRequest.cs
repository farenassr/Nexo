namespace Nexo.Shared.Restaurant;

public sealed record SaveRestaurantTableSeatLayoutRequest(
    int SeatNumber,
    decimal X,
    decimal Y,
    decimal RotationDegrees);
