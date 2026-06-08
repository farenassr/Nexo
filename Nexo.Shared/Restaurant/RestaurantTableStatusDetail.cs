namespace Nexo.Shared.Restaurant;

public sealed record RestaurantTableStatusDetail(
    Guid TableId,
    string Label,
    Guid? AreaId,
    RestaurantTableVisualStatus Status,
    string? Reason,
    Guid? ReservationId);
