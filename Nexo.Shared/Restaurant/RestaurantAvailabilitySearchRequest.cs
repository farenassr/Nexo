namespace Nexo.Shared.Restaurant;

public sealed record RestaurantAvailabilitySearchRequest(
    Guid BranchId,
    int PartySize,
    DateTimeOffset StartAt,
    int? DurationMinutes);
