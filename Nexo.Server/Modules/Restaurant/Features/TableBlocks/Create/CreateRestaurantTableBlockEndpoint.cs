using FastEndpoints;
using Nexo.Server.Modules.Restaurant.Authorization;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.TableBlocks.Create;

public sealed class CreateRestaurantTableBlockEndpoint(
    RestaurantAccessService accessService,
    RestaurantTableBlockService tableBlockService) : Endpoint<CreateRestaurantTableBlockEndpointRequest, object>
{
    public override void Configure()
    {
        Post("/v1/restaurant/table-blocks");
        Summary(summary =>
        {
            summary.Summary = "Creates a restaurant table block.";
            summary.Description = "Creates a scoped operational block for a table, area, or floor.";
        });
    }

    public override async Task HandleAsync(
        CreateRestaurantTableBlockEndpointRequest request,
        CancellationToken cancellationToken)
    {
        var access = await accessService.RequireAsync(RestaurantPermissions.ReservationsManage, cancellationToken);
        if (!access.Succeeded)
        {
            await Send.ForbiddenAsync(cancellationToken);
            return;
        }

        var result = await tableBlockService.CreateAsync(
            new CreateRestaurantTableBlockRequest(
                request.BranchId,
                request.FloorId,
                request.AreaId,
                request.TableId,
                request.StartAt,
                request.EndAt,
                request.Reason),
            cancellationToken);

        if (!result.Succeeded)
        {
            await Send.ResponseAsync(
                new RestaurantOperationErrorResponse(result.FailureCode.ToString(), result.Message),
                result.FailureCode == RestaurantTableBlockFailureCode.NotFound
                    ? StatusCodes.Status404NotFound
                    : StatusCodes.Status400BadRequest,
                cancellationToken);
            return;
        }

        await Send.OkAsync(result.Block!, cancellationToken);
    }
}
