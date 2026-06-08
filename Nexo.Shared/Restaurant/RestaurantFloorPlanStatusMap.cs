namespace Nexo.Shared.Restaurant;

public sealed record RestaurantFloorPlanStatusMap(
    Guid FloorPlanId,
    DateTimeOffset At,
    IReadOnlyCollection<RestaurantTableStatusDetail> Tables);
