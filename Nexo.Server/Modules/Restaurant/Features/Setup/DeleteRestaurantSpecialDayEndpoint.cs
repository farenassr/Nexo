using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;

namespace Nexo.Server.Modules.Restaurant.Features.Setup;

public sealed class DeleteRestaurantSpecialDayEndpoint(
    RestaurantAccessService accessService,
    RestaurantSetupService setupService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("/v1/restaurant/setup/special-days/{SpecialDayId}");
        Description(description => description.WithTags("⚙️ Restaurant Setup"));
        Summary(summary =>
        {
            summary.Summary = "Delete Special Day";
            summary.Description = "Deletes a restaurant holiday or special day override from setup.";
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

        var result = await setupService.DeleteSpecialDayAsync(Route<Guid>("SpecialDayId"), cancellationToken);
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
