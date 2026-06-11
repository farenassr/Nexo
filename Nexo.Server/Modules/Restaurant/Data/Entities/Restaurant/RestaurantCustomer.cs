using Nexo.Server.Data;

namespace Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;

public sealed class RestaurantCustomer : IOrganizationOwnedEntity
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrganizationId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public ICollection<RestaurantReservation> Reservations { get; } = [];
}
