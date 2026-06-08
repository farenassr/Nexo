using Nexo.Server.Data;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;

public sealed class RestaurantTableLayout : ICompanyOwnedEntity
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid CompanyId { get; set; }
    public Guid FloorPlanId { get; set; }
    public Guid TableId { get; set; }
    public RestaurantFloorPlan? FloorPlan { get; set; }
    public RestaurantTable? Table { get; set; }
    public decimal X { get; set; }
    public decimal Y { get; set; }
    public decimal Width { get; set; }
    public decimal Height { get; set; }
    public decimal RotationDegrees { get; set; }
    public RestaurantTableShape Shape { get; set; } = RestaurantTableShape.Rectangle;
    public int ZIndex { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public ICollection<RestaurantTableSeatLayout> SeatLayouts { get; } = [];
}
