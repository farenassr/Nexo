using FastEndpoints;
using Nexo.Server.Modules.Core.ModuleGating;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.GetContext;

public sealed class RestaurantContextEndpoint(
    RestaurantAccessService accessService) : EndpointWithoutRequest<RestaurantContextResponse>
{
    public override void Configure()
    {
        Get("/v1/restaurant/context");
        AllowAnonymous();
        Summary(summary =>
        {
            summary.Summary = "Returns the server-resolved Restaurant module context.";
            summary.Description = "Development-only context check for company scope, module gating, and permission contracts.";
        });
    }

    public override async Task HandleAsync(CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(
            RestaurantPermissions.ContextRead,
            cancellationToken);

        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        await Send.OkAsync(
            new RestaurantContextResponse(
                access.CompanyId!.Value,
                NexoModules.Restaurant,
                [RestaurantPermissions.ContextRead]),
            cancellationToken);
    }
}
