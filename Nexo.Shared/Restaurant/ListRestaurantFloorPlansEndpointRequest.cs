namespace Nexo.Shared.Restaurant;

public sealed class ListRestaurantFloorPlansEndpointRequest
{
    public Guid BranchId { get; set; }
    public Guid FloorId { get; set; }
}
