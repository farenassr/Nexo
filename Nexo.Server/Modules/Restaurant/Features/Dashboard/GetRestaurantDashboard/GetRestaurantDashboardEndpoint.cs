using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Dashboard.GetRestaurantDashboard;

public sealed class GetRestaurantDashboardEndpoint(
    RestaurantAccessService accessService,
    RestaurantDashboardService dashboardService) : Endpoint<RestaurantDashboardRequest, RestaurantDashboardSummary>
{
    public override void Configure()
    {
        Get("/v1/restaurant/dashboard");
        Description(description => description.WithTags("🍽️ Restaurant Reservations"));
        Summary(summary =>
        {
            summary.Summary = "Get Restaurant Dashboard";
            summary.Description = "Returns daily operational metrics, occupancy by hour, and upcoming reservations for a branch.";
        });
    }

    public override async Task HandleAsync(
        RestaurantDashboardRequest request,
        CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.DashboardRead, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        if (request.BranchId == Guid.Empty || request.Date == default)
        {
            await HttpContext.Response.SendAsync(
                new RestaurantOperationErrorResponse("InvalidRequest", "Branch and date are required."),
                StatusCodes.Status400BadRequest,
                cancellation: cancellationToken);
            return;
        }

        var dashboard = await dashboardService.GetAsync(request, cancellationToken);
        await Send.OkAsync(dashboard, cancellationToken);
    }
}
