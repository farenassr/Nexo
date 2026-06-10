using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Setup;

public sealed class CreateRestaurantTableEndpoint(
    RestaurantAccessService accessService,
    RestaurantSetupService setupService) : Endpoint<CreateRestaurantTableRequest, object>
{
    public override void Configure()
    {
        Post("/v1/restaurant/setup/tables");
        Summary(summary => summary.Summary = "Creates a restaurant table.");
    }

    public override async Task HandleAsync(CreateRestaurantTableRequest request, CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.SetupManage, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        var result = await setupService.CreateTableAsync(request, cancellationToken);
        if (!result.Succeeded)
        {
            await Send.ResponseAsync(
                RestaurantSetupEndpointResponses.FromSetupFailure(result),
                RestaurantSetupEndpointResponses.ToStatusCode(result.FailureCode),
                cancellationToken);
            return;
        }

        await Send.OkAsync(result.Table!, cancellationToken);
    }
}
