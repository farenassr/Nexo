namespace Nexo.Shared.Restaurant;

public sealed class UpdateRestaurantReservationStatusEndpointRequest
{
    public Guid ReservationId { get; set; }
    public RestaurantReservationStatus Status { get; set; }
    public string? Reason { get; set; }
}
