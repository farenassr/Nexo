using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Setup;

public static class RestaurantSetupEndpointResponses
{
    public static RestaurantOperationErrorResponse FromSetupFailure(RestaurantSetupOperationResult result)
    {
        return new RestaurantOperationErrorResponse(result.FailureCode.ToString(), result.Message);
    }

    public static int ToStatusCode(RestaurantSetupFailureCode failureCode)
    {
        return failureCode switch
        {
            RestaurantSetupFailureCode.NotFound => StatusCodes.Status404NotFound,
            _ => StatusCodes.Status400BadRequest
        };
    }
}
