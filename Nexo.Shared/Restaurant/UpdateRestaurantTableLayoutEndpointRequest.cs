namespace Nexo.Shared.Restaurant;

public sealed class UpdateRestaurantTableLayoutEndpointRequest
{
    public Guid FloorPlanId { get; set; }
    public Guid TableId { get; set; }
    public decimal X { get; set; }
    public decimal Y { get; set; }
    public decimal Width { get; set; }
    public decimal Height { get; set; }
    public decimal RotationDegrees { get; set; }
    public RestaurantTableShape Shape { get; set; } = RestaurantTableShape.Rectangle;
    public int ZIndex { get; set; }
    public IReadOnlyCollection<SaveRestaurantTableSeatLayoutRequest> SeatLayouts { get; set; } = [];
}
