using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.FloorPlans;

public static class RestaurantFloorPlanEndpointResponses
{
    public static RestaurantOperationErrorResponse FromFloorPlanFailure(RestaurantFloorPlanOperationResult result)
    {
        return new RestaurantOperationErrorResponse(result.FailureCode.ToString(), result.Message);
    }

    public static int ToStatusCode(RestaurantFloorPlanFailureCode failureCode)
    {
        return failureCode switch
        {
            RestaurantFloorPlanFailureCode.NotFound => StatusCodes.Status404NotFound,
            _ => StatusCodes.Status400BadRequest
        };
    }
}
