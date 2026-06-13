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
        Description(description => description.WithTags("⚙️ Restaurant Setup"));
        Summary(summary =>
        {
            summary.Summary = "Save Special Day";
            summary.Description = "Creates or updates a holiday or special day override for restaurant availability.";
        });
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
