using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Server.Modules.Restaurant.Features.Reservations;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Reservations.ListByTable;

public sealed class ListRestaurantTableReservationsEndpoint(
    RestaurantAccessService accessService,
    RestaurantReservationService reservationService) : Endpoint<ListRestaurantTableReservationsEndpointRequest, IReadOnlyCollection<RestaurantReservationDetail>>
{
    public override void Configure()
    {
        Get("/v1/restaurant/tables/{TableId}/reservations");
        Summary(summary =>
        {
            summary.Summary = "Lists daily reservations for one restaurant table.";
            summary.Description = "Returns reservations attached to the selected table for a UTC date.";
        });
    }

    public override async Task HandleAsync(
        ListRestaurantTableReservationsEndpointRequest request,
        CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.ReservationsRead, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        var reservations = await reservationService.ListTableDailyAsync(
            new RestaurantTableReservationListRequest(request.TableId, request.Date),
            cancellationToken);

        await Send.OkAsync(reservations, cancellationToken);
    }
}
