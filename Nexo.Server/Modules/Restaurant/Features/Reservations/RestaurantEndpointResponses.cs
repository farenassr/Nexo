using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Reservations;

public static class RestaurantEndpointResponses
{
    public static RestaurantOperationErrorResponse FromReservationFailure(RestaurantReservationOperationResult result)
    {
        return new RestaurantOperationErrorResponse(result.FailureCode.ToString(), result.Message);
    }

    public static RestaurantOperationErrorResponse FromAvailabilityFailure(RestaurantAvailabilityRejection rejection)
    {
        return new RestaurantOperationErrorResponse(rejection.Code.ToString(), rejection.Message);
    }

    public static int ToStatusCode(RestaurantReservationFailureCode failureCode)
    {
        return failureCode switch
        {
            RestaurantReservationFailureCode.NotFound => StatusCodes.Status404NotFound,
            RestaurantReservationFailureCode.Conflict => StatusCodes.Status409Conflict,
            RestaurantReservationFailureCode.InvalidStatusTransition => StatusCodes.Status409Conflict,
            _ => StatusCodes.Status400BadRequest
        };
    }
}
