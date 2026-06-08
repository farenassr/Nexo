using Nexo.Server.Data;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;

public sealed class RestaurantReservation : ICompanyOwnedEntity
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid CompanyId { get; set; }
    public Guid BranchId { get; set; }
    public Guid CustomerId { get; set; }
    public RestaurantCustomer? Customer { get; set; }
    public int PartySize { get; set; }
    public DateTimeOffset StartAt { get; set; }
    public DateTimeOffset EndAt { get; set; }
    public int TurnoverBufferMinutes { get; set; }
    public RestaurantReservationStatus Status { get; set; } = RestaurantReservationStatus.Pending;
    public RestaurantReservationSource Source { get; set; } = RestaurantReservationSource.Staff;
    public string? SpecialRequests { get; set; }
    public Guid? CreatedByAppUserId { get; set; }
    public DateTimeOffset? CancelledAt { get; set; }
    public string? CancellationReason { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public ICollection<RestaurantReservationTable> ReservationTables { get; } = [];
    public ICollection<RestaurantReservationStatusHistory> StatusHistory { get; } = [];
}
