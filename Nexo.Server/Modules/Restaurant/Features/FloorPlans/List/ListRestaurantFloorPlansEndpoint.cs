using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.FloorPlans.List;

public sealed class ListRestaurantFloorPlansEndpoint(
    RestaurantAccessService accessService,
    RestaurantFloorPlanService floorPlanService) : Endpoint<ListRestaurantFloorPlansEndpointRequest, IReadOnlyCollection<RestaurantFloorPlanSummary>>
{
    public override void Configure()
    {
        Get("/v1/restaurant/floor-plans");
        Description(description => description.WithTags("🪑 Restaurant Floor Plans"));
        Summary(summary =>
        {
            summary.Summary = "List Restaurant Floor Plans";
            summary.Description = "Returns floor plan summaries for a branch and floor in the current organization.";
        });
    }

    public override async Task HandleAsync(
        ListRestaurantFloorPlansEndpointRequest request,
        CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.FloorPlanRead, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        var floorPlans = await floorPlanService.ListAsync(
            new RestaurantFloorPlanListRequest(request.BranchId, request.FloorId),
            cancellationToken);

        await Send.OkAsync(floorPlans, cancellationToken);
    }
}
