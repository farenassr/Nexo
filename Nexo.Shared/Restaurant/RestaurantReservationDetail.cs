namespace Nexo.Shared.Restaurant;

public sealed record RestaurantReservationDetail(
    Guid ReservationId,
    Guid BranchId,
    int PartySize,
    DateTimeOffset StartAt,
    DateTimeOffset EndAt,
    int TurnoverBufferMinutes,
    RestaurantReservationStatus Status,
    RestaurantReservationSource Source,
    string? SpecialRequests,
    DateTimeOffset? CancelledAt,
    string? CancellationReason,
    RestaurantReservationCustomerDetail Customer,
    IReadOnlyCollection<RestaurantReservationTableDetail> Tables,
    IReadOnlyCollection<RestaurantReservationStatusHistoryDetail> StatusHistory);
