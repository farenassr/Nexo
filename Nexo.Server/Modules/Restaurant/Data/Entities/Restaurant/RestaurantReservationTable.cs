using Nexo.Server.Data;

namespace Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;

public sealed class RestaurantReservationTable : ICompanyOwnedEntity
{
    public Guid CompanyId { get; set; }
    public Guid ReservationId { get; set; }
    public Guid TableId { get; set; }
    public RestaurantReservation? Reservation { get; set; }
    public RestaurantTable? Table { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
