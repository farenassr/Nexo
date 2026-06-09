using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;

namespace Nexo.Server.Modules.Restaurant.Features.Setup;

public sealed class DeleteRestaurantAreaEndpoint(
    RestaurantAccessService accessService,
    RestaurantSetupService setupService) : EndpointWithoutRequest<object>
{
    public override void Configure()
    {
        Delete("/v1/restaurant/setup/areas/{AreaId}");
        AllowAnonymous();
        Summary(summary => summary.Summary = "Deletes a restaurant area.");
    }

    public override async Task HandleAsync(CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.SetupManage, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        var result = await setupService.DeleteAreaAsync(Route<Guid>("AreaId"), cancellationToken);
        if (!result.Succeeded)
        {
            await Send.ResponseAsync(
                RestaurantSetupEndpointResponses.FromSetupFailure(result),
                RestaurantSetupEndpointResponses.ToStatusCode(result.FailureCode),
                cancellationToken);
            return;
        }

        await Send.NoContentAsync(cancellationToken);
    }
}
