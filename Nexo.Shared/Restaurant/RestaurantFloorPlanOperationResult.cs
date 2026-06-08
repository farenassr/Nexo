namespace Nexo.Shared.Restaurant;

public sealed record RestaurantFloorPlanOperationResult(
    bool Succeeded,
    RestaurantFloorPlanFailureCode FailureCode,
    string Message,
    RestaurantFloorPlanDetail? FloorPlan)
{
    public static RestaurantFloorPlanOperationResult Success(RestaurantFloorPlanDetail floorPlan)
    {
        return new RestaurantFloorPlanOperationResult(true, RestaurantFloorPlanFailureCode.None, string.Empty, floorPlan);
    }

    public static RestaurantFloorPlanOperationResult Failed(RestaurantFloorPlanFailureCode failureCode, string message)
    {
        return new RestaurantFloorPlanOperationResult(false, failureCode, message, null);
    }
}
