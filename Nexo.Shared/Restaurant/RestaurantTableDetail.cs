namespace Nexo.Shared.Restaurant;

public sealed record RestaurantTableDetail(
    Guid Id,
    Guid CompanyId,
    Guid BranchId,
    Guid FloorId,
    Guid? AreaId,
    string Label,
    int MinCapacity,
    int MaxCapacity,
    int? DefaultReservationMinutes,
    RestaurantTableShape Shape,
    bool IsActive);
