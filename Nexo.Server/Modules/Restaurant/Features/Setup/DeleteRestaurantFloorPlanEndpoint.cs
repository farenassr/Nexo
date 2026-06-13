using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;

namespace Nexo.Server.Modules.Restaurant.Features.Setup;

public sealed class DeleteRestaurantFloorPlanEndpoint(
    RestaurantAccessService accessService,
    RestaurantSetupService setupService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("/v1/restaurant/setup/floor-plans/{FloorPlanId}");
        Description(description => description.WithTags("🪑 Restaurant Floor Plans"));
        Summary(summary =>
        {
            summary.Summary = "Delete Restaurant Floor Plan";
            summary.Description = "Deletes a restaurant floor plan when it is no longer needed for setup or operations.";
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

        var result = await setupService.DeleteFloorPlanAsync(Route<Guid>("FloorPlanId"), cancellationToken);
        if (!result.Succeeded)
        {
            await HttpContext.Response.SendAsync(
                RestaurantSetupEndpointResponses.FromSetupFailure(result),
                RestaurantSetupEndpointResponses.ToStatusCode(result.FailureCode),
                cancellation: cancellationToken);
            return;
        }

        await Send.NoContentAsync(cancellationToken);
    }
}
