namespace Nexo.Shared.Restaurant;

public sealed class ListRestaurantTableReservationsEndpointRequest
{
    public Guid TableId { get; set; }
    public DateOnly Date { get; set; }
}
