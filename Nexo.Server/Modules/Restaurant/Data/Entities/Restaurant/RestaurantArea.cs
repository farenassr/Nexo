using Nexo.Server.Data;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;

public sealed class RestaurantArea : ICompanyOwnedEntity
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid CompanyId { get; set; }
    public Guid BranchId { get; set; }
    public Guid FloorId { get; set; }
    public RestaurantFloor? Floor { get; set; }
    public string Name { get; set; } = string.Empty;
    public RestaurantAreaType Type { get; set; } = RestaurantAreaType.DiningRoom;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public ICollection<RestaurantTable> Tables { get; } = [];
}
