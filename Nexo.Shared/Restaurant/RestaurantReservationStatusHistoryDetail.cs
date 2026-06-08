namespace Nexo.Shared.Restaurant;

public sealed record RestaurantReservationStatusHistoryDetail(
    RestaurantReservationStatus? FromStatus,
    RestaurantReservationStatus ToStatus,
    string? Reason,
    DateTimeOffset ChangedAt);
