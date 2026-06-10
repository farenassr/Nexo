namespace Nexo.Shared.Restaurant;

public sealed record UpsertRestaurantSpecialDayRequest(
    Guid? Id,
    Guid BranchId,
    DateOnly Date,
    string Name,
    bool IsClosed,
    TimeOnly? OpensAt,
    TimeOnly? ClosesAt);
