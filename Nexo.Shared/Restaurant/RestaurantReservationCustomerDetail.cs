namespace Nexo.Shared.Restaurant;

public sealed record RestaurantReservationCustomerDetail(
    Guid CustomerId,
    string FullName,
    string? Phone,
    string? Email);
