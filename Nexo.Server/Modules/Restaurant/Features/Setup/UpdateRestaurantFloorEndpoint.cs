using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Setup;

public sealed class UpdateRestaurantFloorEndpoint(
    RestaurantAccessService accessService,
    RestaurantSetupService setupService) : Endpoint<UpdateRestaurantFloorRequest, RestaurantFloorDetail>
{
    public override void Configure()
    {
        Put("/v1/restaurant/setup/floors/{FloorId}");
        Summary(summary => summary.Summary = "Updates a restaurant floor.");
    }

    public override async Task HandleAsync(UpdateRestaurantFloorRequest request, CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.SetupManage, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        var result = await setupService.UpdateFloorAsync(Route<Guid>("FloorId"), request, cancellationToken);
        if (!result.Succeeded)
        {
            await HttpContext.Response.SendAsync(
                RestaurantSetupEndpointResponses.FromSetupFailure(result),
                RestaurantSetupEndpointResponses.ToStatusCode(result.FailureCode),
                cancellation: cancellationToken);
            return;
        }

        await Send.OkAsync(result.Floor!, cancellationToken);
    }
}
