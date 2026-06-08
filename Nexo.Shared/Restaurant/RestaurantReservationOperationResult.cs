namespace Nexo.Shared.Restaurant;

public sealed record RestaurantReservationOperationResult(
    bool Succeeded,
    RestaurantReservationFailureCode FailureCode,
    string Message,
    RestaurantReservationDetail? Reservation)
{
    public static RestaurantReservationOperationResult Success(RestaurantReservationDetail? reservation)
    {
        return new RestaurantReservationOperationResult(
            true,
            RestaurantReservationFailureCode.None,
            "Success",
            reservation);
    }

    public static RestaurantReservationOperationResult Failed(
        RestaurantReservationFailureCode failureCode,
        string message)
    {
        return new RestaurantReservationOperationResult(false, failureCode, message, null);
    }
}
