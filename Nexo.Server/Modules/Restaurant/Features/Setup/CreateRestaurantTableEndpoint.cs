using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Setup;

public sealed class CreateRestaurantTableEndpoint(
    RestaurantAccessService accessService,
    RestaurantSetupService setupService) : Endpoint<CreateRestaurantTableRequest, RestaurantTableDetail>
{
    public override void Configure()
    {
        Post("/v1/restaurant/setup/tables");
        Description(description => description.WithTags("⚙️ Restaurant Setup"));
        Summary(summary =>
        {
            summary.Summary = "Create Restaurant Table";
            summary.Description = "Creates a table with capacity and shape information for restaurant setup.";
        });
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
            await HttpContext.Response.SendAsync(
                RestaurantSetupEndpointResponses.FromSetupFailure(result),
                RestaurantSetupEndpointResponses.ToStatusCode(result.FailureCode),
                cancellation: cancellationToken);
            return;
        }

        await Send.OkAsync(result.Table!, cancellationToken);
    }
}
