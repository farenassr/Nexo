using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Setup;

public sealed class UpsertRestaurantOpeningHourEndpoint(
    RestaurantAccessService accessService,
    RestaurantSetupService setupService) : Endpoint<UpsertRestaurantOpeningHourRequest, RestaurantOpeningHourDetail>
{
    public override void Configure()
    {
        Put("/v1/restaurant/setup/opening-hours");
        Description(description => description.WithTags("⚙️ Restaurant Setup"));
        Summary(summary =>
        {
            summary.Summary = "Save Opening Hours";
            summary.Description = "Creates or updates the normal weekly opening hours for one restaurant branch day.";
        });
    }

    public override async Task HandleAsync(UpsertRestaurantOpeningHourRequest request, CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.SetupManage, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        var result = await setupService.UpsertOpeningHourAsync(request, cancellationToken);
        if (!result.Succeeded)
        {
            await HttpContext.Response.SendAsync(
                RestaurantSetupEndpointResponses.FromSetupFailure(result),
                RestaurantSetupEndpointResponses.ToStatusCode(result.FailureCode),
                cancellation: cancellationToken);
            return;
        }

        await Send.OkAsync(result.OpeningHour!, cancellationToken);
    }
}
