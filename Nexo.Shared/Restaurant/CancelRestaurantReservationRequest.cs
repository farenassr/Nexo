namespace Nexo.Shared.Restaurant;

public sealed record CancelRestaurantReservationRequest(Guid ReservationId, string? Reason);
