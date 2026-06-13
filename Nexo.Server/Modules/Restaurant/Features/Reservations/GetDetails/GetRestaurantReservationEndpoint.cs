using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Server.Modules.Restaurant.Features.Reservations;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Reservations.GetDetails;

public sealed class GetRestaurantReservationEndpoint(
    RestaurantAccessService accessService,
    RestaurantReservationService reservationService) : Endpoint<GetRestaurantReservationEndpointRequest, RestaurantReservationDetail>
{
    public override void Configure()
    {
        Get("/v1/restaurant/reservations/{ReservationId}");
        Description(description => description.WithTags("🍽️ Restaurant Reservations"));
        Summary(summary =>
        {
            summary.Summary = "Get Restaurant Reservation";
            summary.Description = "Returns reservation details including customer, tables, and status history.";
        });
    }

    public override async Task HandleAsync(
        GetRestaurantReservationEndpointRequest request,
        CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.ReservationsRead, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        var reservation = await reservationService.GetDetailAsync(request.ReservationId, cancellationToken);
        if (reservation is null)
        {
            await Send.NotFoundAsync(cancellationToken);
            return;
        }

        await Send.OkAsync(reservation, cancellationToken);
    }
}
