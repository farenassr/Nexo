namespace Nexo.Shared.Restaurant;

public sealed class GetRestaurantFloorPlanStatusMapEndpointRequest
{
    public Guid FloorPlanId { get; set; }
    public DateTimeOffset At { get; set; }
    public Guid? AreaId { get; set; }
}
