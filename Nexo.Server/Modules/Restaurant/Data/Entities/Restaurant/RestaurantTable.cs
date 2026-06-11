using Nexo.Server.Data;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;

public sealed class RestaurantTable : IOrganizationOwnedEntity
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrganizationId { get; set; }
    public Guid BranchId { get; set; }
    public Guid FloorId { get; set; }
    public Guid? AreaId { get; set; }
    public RestaurantFloor? Floor { get; set; }
    public RestaurantArea? Area { get; set; }
    public string Label { get; set; } = string.Empty;
    public int MinCapacity { get; set; }
    public int MaxCapacity { get; set; }
    public int? DefaultReservationMinutes { get; set; }
    public RestaurantTableShape Shape { get; set; } = RestaurantTableShape.Rectangle;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public ICollection<RestaurantReservationTable> ReservationTables { get; } = [];
}
