namespace Nexo.Server.Modules.Restaurant.Authorization;

public sealed record RestaurantAccessResult(
    bool Succeeded,
    Guid? OrganizationId,
    RestaurantAccessFailure? Failure)
{
    public static RestaurantAccessResult Allowed(Guid organizationId)
    {
        return new RestaurantAccessResult(true, organizationId, null);
    }

    public static RestaurantAccessResult Denied(Guid organizationId, RestaurantAccessFailure failure)
    {
        return new RestaurantAccessResult(false, organizationId, failure);
    }
}
