using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Setup;

public sealed class UpsertRestaurantSpecialDayEndpoint(
    RestaurantAccessService accessService,
    RestaurantSetupService setupService) : Endpoint<UpsertRestaurantSpecialDayRequest, RestaurantSpecialDayDetail>
{
    public override void Configure()
    {
        Put("/v1/restaurant/setup/special-days");
        Summary(summary => summary.Summary = "Creates or updates a restaurant holiday or special day.");
    }

    public override async Task HandleAsync(UpsertRestaurantSpecialDayRequest request, CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.SetupManage, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        var result = await setupService.UpsertSpecialDayAsync(request, cancellationToken);
        if (!result.Succeeded)
        {
            await HttpContext.Response.SendAsync(
                RestaurantSetupEndpointResponses.FromSetupFailure(result),
                RestaurantSetupEndpointResponses.ToStatusCode(result.FailureCode),
                cancellation: cancellationToken);
            return;
        }

        await Send.OkAsync(result.SpecialDay!, cancellationToken);
    }
}
