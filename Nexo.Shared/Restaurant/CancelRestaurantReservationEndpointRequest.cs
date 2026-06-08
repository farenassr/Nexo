namespace Nexo.Shared.Restaurant;

public sealed class CancelRestaurantReservationEndpointRequest
{
    public Guid ReservationId { get; set; }
    public string? Reason { get; set; }
}
