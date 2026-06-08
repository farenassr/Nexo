namespace Nexo.Shared.Restaurant;

public sealed record CreateRestaurantReservationRequest(
    Guid BranchId,
    IReadOnlyCollection<Guid> TableIds,
    int PartySize,
    DateTimeOffset StartAt,
    int? DurationMinutes,
    string CustomerFullName,
    string? CustomerPhone,
    string? CustomerEmail,
    RestaurantReservationSource Source,
    string? SpecialRequests);
