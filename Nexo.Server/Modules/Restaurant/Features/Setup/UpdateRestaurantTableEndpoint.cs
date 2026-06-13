using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Setup;

public sealed class UpdateRestaurantTableEndpoint(
    RestaurantAccessService accessService,
    RestaurantSetupService setupService) : Endpoint<UpdateRestaurantTableRequest, RestaurantTableDetail>
{
    public override void Configure()
    {
        Put("/v1/restaurant/setup/tables/{TableId}");
        Description(description => description.WithTags("⚙️ Restaurant Setup"));
        Summary(summary =>
        {
            summary.Summary = "Update Restaurant Table";
            summary.Description = "Updates table setup details such as label, capacity, turn time, or shape.";
        });
    }

    public override async Task HandleAsync(UpdateRestaurantTableRequest request, CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.SetupManage, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        var result = await setupService.UpdateTableAsync(Route<Guid>("TableId"), request, cancellationToken);
        if (!result.Succeeded)
        {
            await HttpContext.Response.SendAsync(
                RestaurantSetupEndpointResponses.FromSetupFailure(result),
                RestaurantSetupEndpointResponses.ToStatusCode(result.FailureCode),
                cancellation: cancellationToken);
            return;
        }

        await Send.OkAsync(result.Table!, cancellationToken);
    }
}
