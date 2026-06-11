namespace Nexo.Server.Modules.Restaurant.Authorization;

public interface IRestaurantPermissionAuthorizer
{
    ValueTask<RestaurantPermissionResult> AuthorizeAsync(
        Guid organizationId,
        string permission,
        CancellationToken cancellationToken = default);
}
