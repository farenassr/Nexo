using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.FloorPlans.Save;

public sealed class SaveRestaurantFloorPlanEndpoint(
    RestaurantAccessService accessService,
    RestaurantFloorPlanService floorPlanService) : Endpoint<SaveRestaurantFloorPlanEndpointRequest, RestaurantFloorPlanDetail>
{
    public override void Configure()
    {
        Put("/v1/restaurant/floor-plans/{FloorPlanId}");
        Description(description => description.WithTags("🪑 Restaurant Floor Plans"));
        Summary(summary =>
        {
            summary.Summary = "Save Restaurant Floor Plan";
            summary.Description = "Saves the layout editor state by updating floor plan metadata and replacing area, table, and seat layouts.";
        });
    }

    public override async Task HandleAsync(
        SaveRestaurantFloorPlanEndpointRequest request,
        CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.FloorPlanManage, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        var result = await floorPlanService.SaveAsync(
            request.FloorPlanId,
            new SaveRestaurantFloorPlanRequest(
                request.Name,
                request.CanvasWidth,
                request.CanvasHeight,
                request.GridSize,
                request.IsActive,
                request.AreaLayouts,
                request.TableLayouts),
            cancellationToken);

        if (!result.Succeeded)
        {
            await HttpContext.Response.SendAsync(
                RestaurantFloorPlanEndpointResponses.FromFloorPlanFailure(result),
                RestaurantFloorPlanEndpointResponses.ToStatusCode(result.FailureCode),
                cancellation: cancellationToken);
            return;
        }

        await Send.OkAsync(result.FloorPlan!, cancellationToken);
    }
}
