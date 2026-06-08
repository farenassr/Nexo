using Nexo.Server.Data;

namespace Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;

public sealed class RestaurantFloorPlan : ICompanyOwnedEntity
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid CompanyId { get; set; }
    public Guid BranchId { get; set; }
    public Guid FloorId { get; set; }
    public RestaurantFloor? Floor { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal CanvasWidth { get; set; }
    public decimal CanvasHeight { get; set; }
    public decimal? GridSize { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public ICollection<RestaurantAreaLayout> AreaLayouts { get; } = [];
    public ICollection<RestaurantTableLayout> TableLayouts { get; } = [];
}
