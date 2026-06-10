namespace Nexo.Shared.Restaurant;

public sealed record RestaurantOpeningHourDetail(
    Guid Id,
    Guid BranchId,
    DayOfWeek DayOfWeek,
    TimeOnly OpensAt,
    TimeOnly ClosesAt,
    bool IsClosed);
