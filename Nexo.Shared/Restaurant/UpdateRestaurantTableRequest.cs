namespace Nexo.Shared.Restaurant;

public sealed record UpdateRestaurantTableRequest(
    Guid BranchId,
    Guid FloorId,
    Guid? AreaId,
    string Label,
    int MinCapacity,
    int MaxCapacity,
    int? DefaultReservationMinutes,
    RestaurantTableShape Shape,
    bool IsActive);
