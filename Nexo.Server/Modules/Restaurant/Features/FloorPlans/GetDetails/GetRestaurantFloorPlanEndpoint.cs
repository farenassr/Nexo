using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.FloorPlans.GetDetails;

public sealed class GetRestaurantFloorPlanEndpoint(
    RestaurantAccessService accessService,
    RestaurantFloorPlanService floorPlanService) : Endpoint<GetRestaurantFloorPlanEndpointRequest, object>
{
    public override void Configure()
    {
        Get("/v1/restaurant/floor-plans/{FloorPlanId}");
        AllowAnonymous();
        Summary(summary =>
        {
            summary.Summary = "Gets restaurant floor plan details.";
            summary.Description = "Returns plan metadata plus area, table, and seat layouts.";
        });
    }

    public override async Task HandleAsync(
        GetRestaurantFloorPlanEndpointRequest request,
        CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.ReservationsRead, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        var floorPlan = await floorPlanService.GetDetailAsync(request.FloorPlanId, cancellationToken);
        if (floorPlan is null)
        {
            await Send.NotFoundAsync(cancellationToken);
            return;
        }

        await Send.OkAsync(floorPlan, cancellationToken);
    }
}
