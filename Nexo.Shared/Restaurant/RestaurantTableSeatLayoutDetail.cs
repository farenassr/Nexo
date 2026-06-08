namespace Nexo.Shared.Restaurant;

public sealed record RestaurantTableSeatLayoutDetail(
    int SeatNumber,
    decimal X,
    decimal Y,
    decimal RotationDegrees);
