using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.FloorPlans.StatusMap;

public sealed class GetRestaurantFloorPlanStatusMapEndpoint(
    RestaurantAccessService accessService,
    RestaurantFloorPlanService floorPlanService) : Endpoint<GetRestaurantFloorPlanStatusMapEndpointRequest, object>
{
    public override void Configure()
    {
        Get("/v1/restaurant/floor-plans/{FloorPlanId}/status-map");
        AllowAnonymous();
        Summary(summary =>
        {
            summary.Summary = "Gets restaurant floor plan table statuses.";
            summary.Description = "Returns deterministic visual table statuses for a floor plan at a selected instant.";
        });
    }

    public override async Task HandleAsync(
        GetRestaurantFloorPlanStatusMapEndpointRequest request,
        CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.FloorPlanRead, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        if (request.At == default)
        {
            await Send.ResponseAsync(
                new RestaurantOperationErrorResponse(RestaurantFloorPlanFailureCode.InvalidRequest.ToString(), "The status-map instant is required."),
                StatusCodes.Status400BadRequest,
                cancellationToken);
            return;
        }

        var statusMap = await floorPlanService.GetStatusMapAsync(
            new RestaurantFloorPlanStatusMapRequest(request.FloorPlanId, request.At, request.AreaId),
            cancellationToken);

        if (statusMap is null)
        {
            await Send.NotFoundAsync(cancellationToken);
            return;
        }

        await Send.OkAsync(statusMap, cancellationToken);
    }
}
