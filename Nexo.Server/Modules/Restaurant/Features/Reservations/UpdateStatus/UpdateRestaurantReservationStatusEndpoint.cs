using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Server.Modules.Restaurant.Features.Reservations;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Reservations.UpdateStatus;

public sealed class UpdateRestaurantReservationStatusEndpoint(
    RestaurantAccessService accessService,
    RestaurantReservationService reservationService) : Endpoint<UpdateRestaurantReservationStatusEndpointRequest, object>
{
    public override void Configure()
    {
        Put("/v1/restaurant/reservations/{ReservationId}/status");
        Summary(summary =>
        {
            summary.Summary = "Updates restaurant reservation status.";
            summary.Description = "Applies a valid status transition and records status history.";
        });
    }

    public override async Task HandleAsync(
        UpdateRestaurantReservationStatusEndpointRequest request,
        CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.ReservationsManage, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        var result = await reservationService.UpdateStatusAsync(
            new UpdateRestaurantReservationStatusRequest(
                request.ReservationId,
                request.Status,
                request.Reason),
            cancellationToken);

        if (!result.Succeeded)
        {
            await Send.ResponseAsync(
                RestaurantEndpointResponses.FromReservationFailure(result),
                RestaurantEndpointResponses.ToStatusCode(result.FailureCode),
                cancellationToken);
            return;
        }

        await Send.OkAsync(result.Reservation!, cancellationToken);
    }
}
