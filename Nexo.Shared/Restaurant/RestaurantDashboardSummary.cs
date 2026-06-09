namespace Nexo.Shared.Restaurant;

public sealed record RestaurantDashboardSummary(
    Guid BranchId,
    DateOnly Date,
    IReadOnlyCollection<RestaurantDashboardMetric> Metrics,
    IReadOnlyCollection<RestaurantOccupancyByHourPoint> OccupancyByHour,
    IReadOnlyCollection<RestaurantUpcomingReservationSummary> UpcomingReservations);
