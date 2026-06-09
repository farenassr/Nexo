namespace Nexo.Shared.Restaurant;

public sealed record RestaurantTableBlockOperationResult(
    bool Succeeded,
    RestaurantTableBlockFailureCode FailureCode,
    string Message,
    RestaurantTableBlockDetail? Block)
{
    public static RestaurantTableBlockOperationResult Success(RestaurantTableBlockDetail block)
    {
        return new RestaurantTableBlockOperationResult(true, RestaurantTableBlockFailureCode.None, string.Empty, block);
    }

    public static RestaurantTableBlockOperationResult Failed(RestaurantTableBlockFailureCode failureCode, string message)
    {
        return new RestaurantTableBlockOperationResult(false, failureCode, message, null);
    }
}
