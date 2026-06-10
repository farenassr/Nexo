namespace Nexo.Shared.Restaurant;

public sealed record RestaurantSetupOperationResult(
    bool Succeeded,
    RestaurantSetupFailureCode FailureCode,
    string Message,
    RestaurantBranchDetail? Branch = null,
    RestaurantFloorDetail? Floor = null,
    RestaurantAreaDetail? Area = null,
    RestaurantTableDetail? Table = null,
    RestaurantFloorPlanDetail? FloorPlan = null,
    RestaurantFloorPlanSummary? FloorPlanSummary = null,
    RestaurantOpeningHourDetail? OpeningHour = null,
    RestaurantSpecialDayDetail? SpecialDay = null)
{
    public static RestaurantSetupOperationResult Success()
    {
        return new RestaurantSetupOperationResult(true, RestaurantSetupFailureCode.None, string.Empty);
    }

    public static RestaurantSetupOperationResult Success(RestaurantBranchDetail branch)
    {
        return new RestaurantSetupOperationResult(true, RestaurantSetupFailureCode.None, string.Empty, Branch: branch);
    }

    public static RestaurantSetupOperationResult Success(RestaurantFloorDetail floor)
    {
        return new RestaurantSetupOperationResult(true, RestaurantSetupFailureCode.None, string.Empty, Floor: floor);
    }

    public static RestaurantSetupOperationResult Success(RestaurantAreaDetail area)
    {
        return new RestaurantSetupOperationResult(true, RestaurantSetupFailureCode.None, string.Empty, Area: area);
    }

    public static RestaurantSetupOperationResult Success(RestaurantTableDetail table)
    {
        return new RestaurantSetupOperationResult(true, RestaurantSetupFailureCode.None, string.Empty, Table: table);
    }

    public static RestaurantSetupOperationResult Success(RestaurantFloorPlanDetail floorPlan)
    {
        return new RestaurantSetupOperationResult(true, RestaurantSetupFailureCode.None, string.Empty, FloorPlan: floorPlan);
    }

    public static RestaurantSetupOperationResult Success(RestaurantFloorPlanSummary floorPlan)
    {
        return new RestaurantSetupOperationResult(true, RestaurantSetupFailureCode.None, string.Empty, FloorPlanSummary: floorPlan);
    }

    public static RestaurantSetupOperationResult Success(RestaurantOpeningHourDetail openingHour)
    {
        return new RestaurantSetupOperationResult(true, RestaurantSetupFailureCode.None, string.Empty, OpeningHour: openingHour);
    }

    public static RestaurantSetupOperationResult Success(RestaurantSpecialDayDetail specialDay)
    {
        return new RestaurantSetupOperationResult(true, RestaurantSetupFailureCode.None, string.Empty, SpecialDay: specialDay);
    }

    public static RestaurantSetupOperationResult Failed(RestaurantSetupFailureCode failureCode, string message)
    {
        return new RestaurantSetupOperationResult(false, failureCode, message);
    }
}
