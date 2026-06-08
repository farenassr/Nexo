using Nexo.Server.Modules.Core.CompanyContext;
using Nexo.Server.Modules.Core.ModuleGating;

namespace Nexo.Server.Modules.Restaurant.Authorization;

public sealed class RestaurantAccessService(
    ICompanyContextProvider companyContextProvider,
    IModuleGate moduleGate,
    IRestaurantPermissionAuthorizer permissionAuthorizer)
{
    public async ValueTask<RestaurantAccessResult> RequireAsync(
        string permission,
        CancellationToken cancellationToken = default)
    {
        var companyContext = await companyContextProvider.GetCurrentAsync(cancellationToken);
        var moduleGateResult = await moduleGate.EnsureActiveAsync(
            companyContext.CompanyId,
            NexoModules.Restaurant,
            cancellationToken);

        if (!moduleGateResult.IsActive)
        {
            return RestaurantAccessResult.Denied(
                companyContext.CompanyId,
                RestaurantAccessFailure.ModuleInactive);
        }

        var permissionResult = await permissionAuthorizer.AuthorizeAsync(
            companyContext.CompanyId,
            permission,
            cancellationToken);

        return permissionResult.IsAllowed
            ? RestaurantAccessResult.Allowed(companyContext.CompanyId)
            : RestaurantAccessResult.Denied(
                companyContext.CompanyId,
                RestaurantAccessFailure.PermissionDenied);
    }
}
