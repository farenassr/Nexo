using Microsoft.Extensions.Options;

namespace Nexo.Server.Modules.Restaurant.Authorization;

public sealed class DevelopmentRestaurantPermissionAuthorizer(
    IOptions<DevelopmentRestaurantPermissionOptions> options) : IRestaurantPermissionAuthorizer
{
    public ValueTask<RestaurantPermissionResult> AuthorizeAsync(
        Guid organizationId,
        string permission,
        CancellationToken cancellationToken = default)
    {
        var grantedPermissions = options.Value.GrantedPermissions
            .Where(static grantedPermission => !string.IsNullOrWhiteSpace(grantedPermission))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        return ValueTask.FromResult(
            grantedPermissions.Contains(permission)
                ? RestaurantPermissionResult.Allowed()
                : RestaurantPermissionResult.Denied());
    }
}
