namespace Nexo.Shared.Restaurant;

public sealed record RestaurantTableAvailabilityValidationRequest(
    Guid BranchId,
    IReadOnlyCollection<Guid> TableIds,
    int PartySize,
    DateTimeOffset StartAt,
    int? DurationMinutes);
