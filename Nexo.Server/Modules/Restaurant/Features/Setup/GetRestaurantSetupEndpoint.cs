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
        Description(description => description.WithTags("⚙️ Restaurant Setup"));
        Summary(summary =>
        {
            summary.Summary = "Get Restaurant Setup";
            summary.Description = "Returns the setup snapshot with branches, floors, areas, tables, opening rules, special days, and floor plans.";
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
