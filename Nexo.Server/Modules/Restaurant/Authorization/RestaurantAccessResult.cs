namespace Nexo.Server.Modules.Restaurant.Authorization;

public sealed record RestaurantAccessResult(
    bool Succeeded,
    Guid? CompanyId,
    RestaurantAccessFailure? Failure)
{
    public static RestaurantAccessResult Allowed(Guid companyId)
    {
        return new RestaurantAccessResult(true, companyId, null);
    }

    public static RestaurantAccessResult Denied(Guid companyId, RestaurantAccessFailure failure)
    {
        return new RestaurantAccessResult(false, companyId, failure);
    }
}
