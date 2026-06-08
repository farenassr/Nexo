namespace Nexo.Shared.Restaurant;

public enum RestaurantReservationFailureCode
{
    None,
    NotFound,
    InvalidRequest,
    BranchUnavailable,
    ClosedHours,
    SpecialDayClosed,
    TableUnavailable,
    InsufficientCapacity,
    Blocked,
    Conflict,
    InvalidStatusTransition
}
