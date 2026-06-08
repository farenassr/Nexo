using Nexo.Server.Data;

namespace Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;

public sealed class RestaurantTableSeatLayout : ICompanyOwnedEntity
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public Guid CompanyId { get; set; }
    public Guid TableLayoutId { get; set; }
    public RestaurantTableLayout? TableLayout { get; set; }
    public int SeatNumber { get; set; }
    public decimal X { get; set; }
    public decimal Y { get; set; }
    public decimal RotationDegrees { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
