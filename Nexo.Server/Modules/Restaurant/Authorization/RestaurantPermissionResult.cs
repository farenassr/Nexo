namespace Nexo.Server.Modules.Restaurant.Authorization;

public sealed record RestaurantPermissionResult(bool IsAllowed)
{
    public static RestaurantPermissionResult Allowed()
    {
        return new RestaurantPermissionResult(true);
    }

    public static RestaurantPermissionResult Denied()
    {
        return new RestaurantPermissionResult(false);
    }
}
