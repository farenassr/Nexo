using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Setup;

public sealed class UpdateRestaurantFloorPlanMetadataEndpoint(
    RestaurantAccessService accessService,
    RestaurantSetupService setupService) : Endpoint<UpdateRestaurantFloorPlanMetadataRequest, RestaurantFloorPlanSummary>
{
    public override void Configure()
    {
        Put("/v1/restaurant/setup/floor-plans/{FloorPlanId}/metadata");
        Description(description => description.WithTags("🪑 Restaurant Floor Plans"));
        Summary(summary =>
        {
            summary.Summary = "Update Floor Plan Metadata";
            summary.Description = "Updates floor plan setup metadata without replacing the layout editor canvas contents.";
        });
    }

    public override async Task HandleAsync(UpdateRestaurantFloorPlanMetadataRequest request, CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.SetupManage, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        var result = await setupService.UpdateFloorPlanMetadataAsync(Route<Guid>("FloorPlanId"), request, cancellationToken);
        if (!result.Succeeded)
        {
            await HttpContext.Response.SendAsync(
                RestaurantSetupEndpointResponses.FromSetupFailure(result),
                RestaurantSetupEndpointResponses.ToStatusCode(result.FailureCode),
                cancellation: cancellationToken);
            return;
        }

        await Send.OkAsync(result.FloorPlanSummary!, cancellationToken);
    }
}
