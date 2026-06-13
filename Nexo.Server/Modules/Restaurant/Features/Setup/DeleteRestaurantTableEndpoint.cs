using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;

namespace Nexo.Server.Modules.Restaurant.Features.Setup;

public sealed class DeleteRestaurantTableEndpoint(
    RestaurantAccessService accessService,
    RestaurantSetupService setupService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Delete("/v1/restaurant/setup/tables/{TableId}");
        Description(description => description.WithTags("⚙️ Restaurant Setup"));
        Summary(summary =>
        {
            summary.Summary = "Delete Restaurant Table";
            summary.Description = "Deletes a restaurant table when it is not required by active setup or reservation data.";
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

        var result = await setupService.DeleteTableAsync(Route<Guid>("TableId"), cancellationToken);
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
