namespace Nexo.Shared.Restaurant;

public sealed record RestaurantSetupSnapshot(
    Guid OrganizationId,
    IReadOnlyCollection<RestaurantBranchDetail> Branches,
    IReadOnlyCollection<RestaurantFloorDetail> Floors,
    IReadOnlyCollection<RestaurantAreaDetail> Areas,
    IReadOnlyCollection<RestaurantTableDetail> Tables,
    IReadOnlyCollection<RestaurantFloorPlanSummary> FloorPlans,
    IReadOnlyCollection<RestaurantOpeningHourDetail> OpeningHours,
    IReadOnlyCollection<RestaurantSpecialDayDetail> SpecialDays);
