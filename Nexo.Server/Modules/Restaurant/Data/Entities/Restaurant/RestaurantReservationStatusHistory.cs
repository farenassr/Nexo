using Nexo.Server.Data;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;

public sealed class RestaurantReservationStatusHistory : IOrganizationOwnedEntity
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid OrganizationId { get; set; }
    public Guid ReservationId { get; set; }
    public RestaurantReservation? Reservation { get; set; }
    public RestaurantReservationStatus? FromStatus { get; set; }
    public RestaurantReservationStatus ToStatus { get; set; }
    public string? Reason { get; set; }
    public Guid? ChangedByAppUserId { get; set; }
    public DateTimeOffset ChangedAt { get; set; }
}
