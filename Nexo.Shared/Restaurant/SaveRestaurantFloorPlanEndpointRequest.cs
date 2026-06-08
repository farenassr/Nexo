namespace Nexo.Shared.Restaurant;

public sealed class SaveRestaurantFloorPlanEndpointRequest
{
    public Guid FloorPlanId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal CanvasWidth { get; set; }
    public decimal CanvasHeight { get; set; }
    public decimal? GridSize { get; set; }
    public bool IsActive { get; set; }
    public IReadOnlyCollection<SaveRestaurantAreaLayoutRequest> AreaLayouts { get; set; } = [];
    public IReadOnlyCollection<SaveRestaurantTableLayoutRequest> TableLayouts { get; set; } = [];
}
