using Microsoft.EntityFrameworkCore;
using Nexo.Server.Data;
using Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;
using Nexo.Server.Modules.Restaurant.Data.Extensions;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.TableBlocks;

public sealed class RestaurantTableBlockService(NexoDbContext dbContext, TimeProvider timeProvider)
{
    public async Task<RestaurantTableBlockOperationResult> CreateAsync(
        CreateRestaurantTableBlockRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.BranchId == Guid.Empty
            || request.StartAt == default
            || request.EndAt == default
            || request.EndAt <= request.StartAt
            || (request.FloorId is null && request.AreaId is null && request.TableId is null))
        {
            return RestaurantTableBlockOperationResult.Failed(
                RestaurantTableBlockFailureCode.InvalidRequest,
                "Branch, valid time range, and at least one block scope are required.");
        }

        var branchExists = await dbContext.CoreBranches
            .AsNoTracking()
            .ForBranch(request.BranchId)
            .ActiveOnly()
            .AnyAsync(cancellationToken);
        if (!branchExists)
        {
            return RestaurantTableBlockOperationResult.Failed(
                RestaurantTableBlockFailureCode.NotFound,
                "Branch was not found.");
        }

        if (!await ScopeExistsAsync(request, cancellationToken))
        {
            return RestaurantTableBlockOperationResult.Failed(
                RestaurantTableBlockFailureCode.NotFound,
                "Block scope was not found.");
        }

        var now = timeProvider.GetUtcNow();
        var block = new RestaurantTableBlock
        {
            CompanyId = dbContext.CurrentCompanyId,
            BranchId = request.BranchId,
            FloorId = request.FloorId,
            AreaId = request.AreaId,
            TableId = request.TableId,
            StartAt = request.StartAt,
            EndAt = request.EndAt,
            Reason = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim(),
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.RestaurantTableBlocks.Add(block);
        await dbContext.SaveChangesAsync(cancellationToken);

        return RestaurantTableBlockOperationResult.Success(ToDetail(block));
    }

    private async Task<bool> ScopeExistsAsync(
        CreateRestaurantTableBlockRequest request,
        CancellationToken cancellationToken)
    {
        if (request.TableId.HasValue)
        {
            return await dbContext.RestaurantTables
                .AsNoTracking()
                .ActiveOnly()
                .AnyAsync(table =>
                    table.Id == request.TableId.Value
                    && table.BranchId == request.BranchId
                    && (!request.FloorId.HasValue || table.FloorId == request.FloorId.Value)
                    && (!request.AreaId.HasValue || table.AreaId == request.AreaId.Value),
                    cancellationToken);
        }

        if (request.AreaId.HasValue)
        {
            return await dbContext.RestaurantAreas
                .AsNoTracking()
                .ActiveOnly()
                .AnyAsync(area =>
                    area.Id == request.AreaId.Value
                    && area.BranchId == request.BranchId
                    && (!request.FloorId.HasValue || area.FloorId == request.FloorId.Value),
                    cancellationToken);
        }

        return await dbContext.RestaurantFloors
            .AsNoTracking()
            .ActiveOnly()
            .AnyAsync(floor => floor.Id == request.FloorId!.Value && floor.BranchId == request.BranchId, cancellationToken);
    }

    private static RestaurantTableBlockDetail ToDetail(RestaurantTableBlock block)
    {
        return new RestaurantTableBlockDetail(
            block.Id,
            block.BranchId,
            block.FloorId,
            block.AreaId,
            block.TableId,
            block.StartAt,
            block.EndAt,
            block.Reason,
            block.IsActive);
    }
}
