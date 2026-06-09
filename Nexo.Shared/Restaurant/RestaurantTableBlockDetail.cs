namespace Nexo.Shared.Restaurant;

public sealed record RestaurantTableBlockDetail(
    Guid Id,
    Guid BranchId,
    Guid? FloorId,
    Guid? AreaId,
    Guid? TableId,
    DateTimeOffset StartAt,
    DateTimeOffset EndAt,
    string? Reason,
    bool IsActive);
