namespace Nexo.Shared.Restaurant;

public sealed record RestaurantFloorPlanStatusMapRequest(Guid FloorPlanId, DateTimeOffset At, Guid? AreaId);
