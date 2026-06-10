using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.FloorPlans.UpdateTableLayout;

public sealed class UpdateRestaurantTableLayoutEndpoint(
    RestaurantAccessService accessService,
    RestaurantFloorPlanService floorPlanService) : Endpoint<UpdateRestaurantTableLayoutEndpointRequest, object>
{
    public override void Configure()
    {
        Put("/v1/restaurant/floor-plans/{FloorPlanId}/tables/{TableId}/layout");
        Summary(summary =>
        {
            summary.Summary = "Updates a restaurant table layout.";
            summary.Description = "Moves or upserts one table layout inside a floor plan.";
        });
    }

    public override async Task HandleAsync(
        UpdateRestaurantTableLayoutEndpointRequest request,
        CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.FloorPlanManage, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        var result = await floorPlanService.UpdateTableLayoutAsync(
            request.FloorPlanId,
            request.TableId,
            new SaveRestaurantTableLayoutRequest(
                request.TableId,
                request.X,
                request.Y,
                request.Width,
                request.Height,
                request.RotationDegrees,
                request.Shape,
                request.ZIndex,
                request.SeatLayouts),
            cancellationToken);

        if (!result.Succeeded)
        {
            await Send.ResponseAsync(
                RestaurantFloorPlanEndpointResponses.FromFloorPlanFailure(result),
                RestaurantFloorPlanEndpointResponses.ToStatusCode(result.FailureCode),
                cancellationToken);
            return;
        }

        await Send.OkAsync(result.FloorPlan!, cancellationToken);
    }
}
