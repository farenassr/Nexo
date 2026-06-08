using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Server.Modules.Restaurant.Features.Availability;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Availability.Search;

public sealed class SearchRestaurantAvailabilityEndpoint(
    RestaurantAccessService accessService,
    RestaurantAvailabilityService availabilityService) : Endpoint<SearchRestaurantAvailabilityEndpointRequest, object>
{
    public override void Configure()
    {
        Post("/v1/restaurant/availability/search");
        AllowAnonymous();
        Summary(summary =>
        {
            summary.Summary = "Searches available restaurant tables.";
            summary.Description = "Returns table options for a branch, party size, start time, and optional duration.";
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
