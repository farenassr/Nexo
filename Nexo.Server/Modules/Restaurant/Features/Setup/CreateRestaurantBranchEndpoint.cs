using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Setup;

public sealed class CreateRestaurantBranchEndpoint(
    RestaurantAccessService accessService,
    RestaurantSetupService setupService) : Endpoint<CreateRestaurantBranchRequest, RestaurantBranchDetail>
{
    public override void Configure()
    {
        Post("/v1/restaurant/setup/branches");
        Description(description => description.WithTags("🏢 Branches"));
        Summary(summary =>
        {
            summary.Summary = "Create Branch";
            summary.Description = "Creates a restaurant branch setup record for the current organization.";
        });
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
            await HttpContext.Response.SendAsync(
                RestaurantSetupEndpointResponses.FromSetupFailure(result),
                RestaurantSetupEndpointResponses.ToStatusCode(result.FailureCode),
                cancellation: cancellationToken);
            return;
        }

        await Send.OkAsync(result.Branch!, cancellationToken);
    }
}
