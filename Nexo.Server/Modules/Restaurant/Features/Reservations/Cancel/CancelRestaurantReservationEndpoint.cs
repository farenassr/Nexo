using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Server.Modules.Restaurant.Features.Reservations;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Reservations.Cancel;

public sealed class CancelRestaurantReservationEndpoint(
    RestaurantAccessService accessService,
    RestaurantReservationService reservationService) : Endpoint<CancelRestaurantReservationEndpointRequest, RestaurantReservationDetail>
{
    public override void Configure()
    {
        Post("/v1/restaurant/reservations/{ReservationId}/cancel");
        Description(description => description.WithTags("🍽️ Restaurant Reservations"));
        Summary(summary =>
        {
            summary.Summary = "Cancel Restaurant Reservation";
            summary.Description = "Cancels a reservation, stores the reason, and records status history.";
        });
    }

    public override async Task HandleAsync(
        CancelRestaurantReservationEndpointRequest request,
        CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.ReservationsManage, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        var result = await reservationService.CancelAsync(
            new CancelRestaurantReservationRequest(request.ReservationId, request.Reason),
            cancellationToken);

        if (!result.Succeeded)
        {
            await HttpContext.Response.SendAsync(
                RestaurantEndpointResponses.FromReservationFailure(result),
                RestaurantEndpointResponses.ToStatusCode(result.FailureCode),
                cancellation: cancellationToken);
            return;
        }

        await Send.OkAsync(result.Reservation!, cancellationToken);
    }
}
