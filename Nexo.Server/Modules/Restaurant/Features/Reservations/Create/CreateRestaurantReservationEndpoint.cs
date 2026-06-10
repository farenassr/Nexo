using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Server.Modules.Restaurant.Features.Reservations;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Reservations.Create;

public sealed class CreateRestaurantReservationEndpoint(
    RestaurantAccessService accessService,
    RestaurantReservationService reservationService) : Endpoint<CreateRestaurantReservationEndpointRequest, RestaurantReservationDetail>
{
    public override void Configure()
    {
        Post("/v1/restaurant/reservations");
        Summary(summary =>
        {
            summary.Summary = "Creates a restaurant reservation.";
            summary.Description = "Creates a customer, reservation, table assignment, and creation status history after availability validation.";
        });
    }

    public override async Task HandleAsync(
        CreateRestaurantReservationEndpointRequest request,
        CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.ReservationsManage, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        var result = await reservationService.CreateAsync(
            new CreateRestaurantReservationRequest(
                request.BranchId,
                request.TableIds,
                request.PartySize,
                request.StartAt,
                request.DurationMinutes,
                request.CustomerFullName,
                request.CustomerPhone,
                request.CustomerEmail,
                request.Source,
                request.SpecialRequests),
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
