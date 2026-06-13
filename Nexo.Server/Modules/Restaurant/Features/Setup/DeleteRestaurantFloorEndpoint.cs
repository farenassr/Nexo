using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;

namespace Nexo.Server.Modules.Restaurant.Features.Setup;

public sealed class DeleteRestaurantFloorEndpoint(
    RestaurantAccessService accessService,
    RestaurantSetupService setupService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("/v1/restaurant/setup/floors/{FloorId}");
        Description(description => description.WithTags("⚙️ Restaurant Setup"));
        Summary(summary =>
        {
            summary.Summary = "Delete Restaurant Floor";
            summary.Description = "Deletes a restaurant floor and its setup data when dependencies allow removal.";
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

        var result = await setupService.DeleteFloorAsync(Route<Guid>("FloorId"), cancellationToken);
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
