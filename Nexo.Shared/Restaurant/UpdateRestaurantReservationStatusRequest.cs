namespace Nexo.Shared.Restaurant;

public sealed record UpdateRestaurantReservationStatusRequest(
    Guid ReservationId,
    RestaurantReservationStatus Status,
    string? Reason);
