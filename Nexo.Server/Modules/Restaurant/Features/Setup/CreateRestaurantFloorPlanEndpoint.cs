using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Setup;

public sealed class CreateRestaurantFloorPlanEndpoint(
    RestaurantAccessService accessService,
    RestaurantSetupService setupService) : Endpoint<CreateRestaurantFloorPlanRequest, RestaurantFloorPlanDetail>
{
    public override void Configure()
    {
        Post("/v1/restaurant/setup/floor-plans");
        Description(description => description.WithTags("🪑 Restaurant Floor Plans"));
        Summary(summary =>
        {
            summary.Summary = "Create Restaurant Floor Plan";
            summary.Description = "Creates a floor plan for a branch and floor with initial canvas layout settings.";
        });
    }

    public override async Task HandleAsync(CreateRestaurantFloorPlanRequest request, CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.SetupManage, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        var result = await setupService.CreateFloorPlanAsync(request, cancellationToken);
        if (!result.Succeeded)
        {
            await HttpContext.Response.SendAsync(
                RestaurantSetupEndpointResponses.FromSetupFailure(result),
                RestaurantSetupEndpointResponses.ToStatusCode(result.FailureCode),
                cancellation: cancellationToken);
            return;
        }

        await Send.OkAsync(result.FloorPlan!, cancellationToken);
    }
}
