using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Server.Modules.Restaurant.Features.Availability;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Availability.Search;

public sealed class SearchRestaurantAvailabilityEndpoint(
    RestaurantAccessService accessService,
    RestaurantAvailabilityService availabilityService) : Endpoint<SearchRestaurantAvailabilityEndpointRequest, RestaurantAvailabilitySearchResult>
{
    public override void Configure()
    {
        Post("/v1/restaurant/availability/search");
        Description(description => description.WithTags("🍽️ Restaurant Reservations"));
        Summary(summary =>
        {
            summary.Summary = "List Restaurant Availability";
            summary.Description = "Returns table options for a branch, party size, start time, and optional duration before creating a reservation.";
        });
    }

    public override async Task HandleAsync(
        SearchRestaurantAvailabilityEndpointRequest request,
        CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.ReservationsRead, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        var result = await availabilityService.SearchAsync(
            new RestaurantAvailabilitySearchRequest(
                request.BranchId,
                request.PartySize,
                request.StartAt,
                request.DurationMinutes),
            cancellationToken);

        await Send.OkAsync(result, cancellationToken);
    }
}
