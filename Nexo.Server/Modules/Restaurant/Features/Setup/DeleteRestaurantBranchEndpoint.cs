using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;

namespace Nexo.Server.Modules.Restaurant.Features.Setup;

public sealed class DeleteRestaurantBranchEndpoint(
    RestaurantAccessService accessService,
    RestaurantSetupService setupService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("/v1/restaurant/setup/branches/{BranchId}");
        Description(description => description.WithTags("🏢 Branches"));
        Summary(summary =>
        {
            summary.Summary = "Delete Branch";
            summary.Description = "Deletes a restaurant branch and its setup tree when no protected data blocks removal.";
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

        var result = await setupService.DeleteBranchAsync(Route<Guid>("BranchId"), cancellationToken);
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
