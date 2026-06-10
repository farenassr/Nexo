namespace Nexo.Shared.Restaurant;

public sealed record UpsertRestaurantOpeningHourRequest(
    Guid BranchId,
    DayOfWeek DayOfWeek,
    TimeOnly OpensAt,
    TimeOnly ClosesAt,
    bool IsClosed);
