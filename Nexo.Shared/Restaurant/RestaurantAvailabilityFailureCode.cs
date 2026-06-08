namespace Nexo.Shared.Restaurant;

public enum RestaurantAvailabilityFailureCode
{
    None,
    BranchUnavailable,
    ClosedHours,
    SpecialDayClosed,
    TableUnavailable,
    InsufficientCapacity,
    Blocked,
    Conflict
}
