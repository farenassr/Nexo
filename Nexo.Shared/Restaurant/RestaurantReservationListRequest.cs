namespace Nexo.Shared.Restaurant;

public sealed record RestaurantReservationListRequest(
    Guid BranchId,
    DateOnly Date,
    RestaurantReservationStatus? Status);
