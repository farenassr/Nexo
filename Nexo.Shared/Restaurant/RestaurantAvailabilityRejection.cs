namespace Nexo.Shared.Restaurant;

public sealed record RestaurantAvailabilityRejection(
    Guid? TableId,
    RestaurantAvailabilityFailureCode Code,
    string Message);
