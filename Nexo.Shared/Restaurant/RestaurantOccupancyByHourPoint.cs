namespace Nexo.Shared.Restaurant;

public sealed record RestaurantOccupancyByHourPoint(
    int Hour,
    int ReservationCount,
    int OccupiedCovers,
    int OccupancyPercent);
