using Nexo.Server.Modules.Core.OrganizationContext;
using Nexo.Server.Modules.Core.ModuleGating;

namespace Nexo.Server.Modules.Restaurant.Authorization;

public sealed class RestaurantAccessService(
    IOrganizationContextProvider organizationContextProvider,
    IModuleGate moduleGate,
    IRestaurantPermissionAuthorizer permissionAuthorizer)
{
    public async ValueTask<RestaurantAccessResult> RequireAsync(
        string permission,
        CancellationToken cancellationToken = default)
    {
        var organizationContext = await organizationContextProvider.GetCurrentAsync(cancellationToken);
        var moduleGateResult = await moduleGate.EnsureActiveAsync(
            organizationContext.OrganizationId,
            NexoModules.Restaurant,
            cancellationToken);

        if (!moduleGateResult.IsActive)
        {
            return RestaurantAccessResult.Denied(
                organizationContext.OrganizationId,
                RestaurantAccessFailure.ModuleInactive);
        }

        var permissionResult = await permissionAuthorizer.AuthorizeAsync(
            organizationContext.OrganizationId,
            permission,
            cancellationToken);

        return permissionResult.IsAllowed
            ? RestaurantAccessResult.Allowed(organizationContext.OrganizationId)
            : RestaurantAccessResult.Denied(
                organizationContext.OrganizationId,
                RestaurantAccessFailure.PermissionDenied);
    }
}
