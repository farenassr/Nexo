namespace Nexo.Shared.Restaurant;

public sealed class ListRestaurantReservationsEndpointRequest
{
    public Guid BranchId { get; set; }
    public DateOnly Date { get; set; }
    public RestaurantReservationStatus? Status { get; set; }
}
