namespace Nexo.Shared.Restaurant;

public sealed record RestaurantTableReservationListRequest(Guid TableId, DateOnly Date);
