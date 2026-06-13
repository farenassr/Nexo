using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Setup;

public sealed class UpdateRestaurantBranchEndpoint(
    RestaurantAccessService accessService,
    RestaurantSetupService setupService) : Endpoint<UpdateRestaurantBranchRequest, RestaurantBranchDetail>
{
    public override void Configure()
    {
        Put("/v1/restaurant/setup/branches/{BranchId}");
        Description(description => description.WithTags("🏢 Branches"));
        Summary(summary =>
        {
            summary.Summary = "Update Branch";
            summary.Description = "Updates restaurant branch setup details such as name, description, and time zone.";
        });
    }

    public override async Task HandleAsync(UpdateRestaurantBranchRequest request, CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.SetupManage, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        var result = await setupService.UpdateBranchAsync(Route<Guid>("BranchId"), request, cancellationToken);
        if (!result.Succeeded)
        {
            await SendSetupFailureAsync(result, cancellationToken);
            return;
        }

        await Send.OkAsync(result.Branch!, cancellationToken);
    }

    private Task SendSetupFailureAsync(RestaurantSetupOperationResult result, CancellationToken cancellationToken)
    {
        return HttpContext.Response.SendAsync(
            RestaurantSetupEndpointResponses.FromSetupFailure(result),
            RestaurantSetupEndpointResponses.ToStatusCode(result.FailureCode),
            cancellation: cancellationToken);
    }
}
