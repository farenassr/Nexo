using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Setup;

public sealed class GetRestaurantSetupEndpoint(
    RestaurantAccessService accessService,
    RestaurantSetupService setupService) : EndpointWithoutRequest<RestaurantSetupSnapshot>
{
    public override void Configure()
    {
        Get("/v1/restaurant/setup");
        Summary(summary =>
        {
            summary.Summary = "Gets restaurant setup state.";
            summary.Description = "Returns branches, floors, areas, tables, and floor plans for the active development company.";
        });
    }

    public override async Task HandleAsync(CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.SetupManage, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        await Send.OkAsync(await setupService.GetSnapshotAsync(cancellationToken), cancellationToken);
    }
}
