namespace Nexo.Shared.Restaurant;

public sealed record RestaurantSpecialDayDetail(
    Guid Id,
    Guid BranchId,
    DateOnly Date,
    string Name,
    bool IsClosed,
    TimeOnly? OpensAt,
    TimeOnly? ClosesAt);
