namespace Nexo.Shared.Restaurant;

public sealed record CreateRestaurantTableRequest(
    Guid BranchId,
    Guid FloorId,
    Guid? AreaId,
    string Label,
    int MinCapacity,
    int MaxCapacity,
    int? DefaultReservationMinutes,
    RestaurantTableShape Shape);
