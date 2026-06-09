namespace Nexo.Shared.Restaurant;

public sealed record CreateRestaurantTableBlockRequest(
    Guid BranchId,
    Guid? FloorId,
    Guid? AreaId,
    Guid? TableId,
    DateTimeOffset StartAt,
    DateTimeOffset EndAt,
    string? Reason);
