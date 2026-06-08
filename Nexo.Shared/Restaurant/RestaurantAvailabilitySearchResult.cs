namespace Nexo.Shared.Restaurant;

public sealed record RestaurantAvailabilitySearchResult(
    IReadOnlyCollection<RestaurantAvailabilityTableOption> AvailableTables,
    IReadOnlyCollection<RestaurantAvailabilityRejection> Rejections);
