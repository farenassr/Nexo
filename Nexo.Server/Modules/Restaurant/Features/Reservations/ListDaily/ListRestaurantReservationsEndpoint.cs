using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Server.Modules.Restaurant.Features.Reservations;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Reservations.ListDaily;

public sealed class ListRestaurantReservationsEndpoint(
    RestaurantAccessService accessService,
    RestaurantReservationService reservationService) : Endpoint<ListRestaurantReservationsEndpointRequest, IReadOnlyCollection<RestaurantReservationDetail>>
{
    public override void Configure()
    {
        Get("/v1/restaurant/reservations");
        Summary(summary =>
        {
            summary.Summary = "Lists restaurant reservations for a day.";
            summary.Description = "Returns daily reservations for a branch with an optional status filter.";
        });
    }

    public override async Task HandleAsync(
        ListRestaurantReservationsEndpointRequest request,
        CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.ReservationsRead, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        var reservations = await reservationService.ListDailyAsync(
            new RestaurantReservationListRequest(request.BranchId, request.Date, request.Status),
            cancellationToken);

        await Send.OkAsync(reservations, cancellationToken);
    }
}
