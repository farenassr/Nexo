namespace Nexo.Server.Modules.Restaurant.Authorization;

public interface IRestaurantPermissionAuthorizer
{
    ValueTask<RestaurantPermissionResult> AuthorizeAsync(
        Guid companyId,
        string permission,
        CancellationToken cancellationToken = default);
}
