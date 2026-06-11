using Nexo.Server.Data;

namespace Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;

public sealed class RestaurantOpeningHour : IOrganizationOwnedEntity
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrganizationId { get; set; }
    public Guid BranchId { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly OpensAt { get; set; }
    public TimeOnly ClosesAt { get; set; }
    public bool IsClosed { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
