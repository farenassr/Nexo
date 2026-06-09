namespace Nexo.Shared.Restaurant;

public sealed record RestaurantUpcomingReservationSummary(
    Guid ReservationId,
    DateTimeOffset StartAt,
    DateTimeOffset EndAt,
    string CustomerName,
    int PartySize,
    RestaurantReservationStatus Status,
    IReadOnlyCollection<string> TableLabels);
