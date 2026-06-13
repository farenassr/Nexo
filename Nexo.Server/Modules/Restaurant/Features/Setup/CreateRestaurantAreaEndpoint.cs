using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Setup;

public sealed class CreateRestaurantAreaEndpoint(
    RestaurantAccessService accessService,
    RestaurantSetupService setupService) : Endpoint<CreateRestaurantAreaRequest, RestaurantAreaDetail>
{
    public override void Configure()
    {
        Post("/v1/restaurant/setup/areas");
        Description(description => description.WithTags("⚙️ Restaurant Setup"));
        Summary(summary =>
        {
            summary.Summary = "Create Restaurant Area";
            summary.Description = "Creates an area inside a restaurant floor for grouping tables and layouts.";
        });
    }

    public override async Task HandleAsync(CreateRestaurantAreaRequest request, CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.SetupManage, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        var result = await setupService.CreateAreaAsync(request, cancellationToken);
        if (!result.Succeeded)
        {
            await HttpContext.Response.SendAsync(
                RestaurantSetupEndpointResponses.FromSetupFailure(result),
                RestaurantSetupEndpointResponses.ToStatusCode(result.FailureCode),
                cancellation: cancellationToken);
            return;
        }

        await Send.OkAsync(result.Area!, cancellationToken);
    }
}
