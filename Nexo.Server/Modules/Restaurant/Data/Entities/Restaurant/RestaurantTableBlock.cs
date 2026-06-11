using Nexo.Server.Data;

namespace Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;

public sealed class RestaurantTableBlock : IOrganizationOwnedEntity
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrganizationId { get; set; }
    public Guid BranchId { get; set; }
    public Guid? FloorId { get; set; }
    public Guid? AreaId { get; set; }
    public Guid? TableId { get; set; }
    public DateTimeOffset StartAt { get; set; }
    public DateTimeOffset EndAt { get; set; }
    public string? Reason { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
