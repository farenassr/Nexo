using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Setup;

public sealed class CreateRestaurantBranchEndpoint(
    RestaurantAccessService accessService,
    RestaurantSetupService setupService) : Endpoint<CreateRestaurantBranchRequest, object>
{
    public override void Configure()
    {
        Post("/v1/restaurant/setup/branches");
        AllowAnonymous();
        Summary(summary => summary.Summary = "Creates a restaurant branch.");
    }

    public override async Task HandleAsync(CreateRestaurantBranchRequest request, CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.SetupManage, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        var result = await setupService.CreateBranchAsync(request, cancellationToken);
        if (!result.Succeeded)
        {
            await Send.ResponseAsync(
                RestaurantSetupEndpointResponses.FromSetupFailure(result),
                RestaurantSetupEndpointResponses.ToStatusCode(result.FailureCode),
                cancellationToken);
            return;
        }

        await Send.OkAsync(result.Branch!, cancellationToken);
    }
}
