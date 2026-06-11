using Microsoft.EntityFrameworkCore;
using Nexo.Server.Data;
using Nexo.Server.Modules.Core.Data.Entities;
using Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Setup;

public sealed class RestaurantSetupService(NexoDbContext dbContext, TimeProvider timeProvider)
{
    public async Task<RestaurantSetupSnapshot> GetSnapshotAsync(CancellationToken cancellationToken = default)
    {
        var branches = await dbContext.CoreBranches
            .AsNoTracking()
            .OrderBy(static branch => branch.Name)
            .Select(static branch => new RestaurantBranchDetail(
                branch.Id,
                branch.OrganizationId,
                branch.Name,
                branch.Address,
                branch.TimeZone,
                branch.IsActive))
            .ToArrayAsync(cancellationToken);

        var branchIds = branches.Select(static branch => branch.Id).ToArray();
        var floors = await dbContext.RestaurantFloors
            .AsNoTracking()
            .Where(floor => branchIds.Contains(floor.BranchId))
            .OrderBy(static floor => floor.SortOrder)
            .ThenBy(static floor => floor.Name)
            .Select(static floor => new RestaurantFloorDetail(
                floor.Id,
                floor.BranchId,
                floor.Name,
                floor.SortOrder,
                floor.IsActive))
            .ToArrayAsync(cancellationToken);

        var areas = await dbContext.RestaurantAreas
            .AsNoTracking()
            .Where(area => branchIds.Contains(area.BranchId))
            .OrderBy(static area => area.SortOrder)
            .ThenBy(static area => area.Name)
            .Select(static area => new RestaurantAreaDetail(
                area.Id,
                area.BranchId,
                area.FloorId,
                area.Name,
                area.Type,
                area.SortOrder,
                area.IsActive))
            .ToArrayAsync(cancellationToken);

        var tables = await dbContext.RestaurantTables
            .AsNoTracking()
            .Where(table => branchIds.Contains(table.BranchId))
            .OrderBy(static table => table.Label)
            .Select(static table => new RestaurantTableDetail(
                table.Id,
                table.OrganizationId,
                table.BranchId,
                table.FloorId,
                table.AreaId,
                table.Label,
                table.MinCapacity,
                table.MaxCapacity,
                table.DefaultReservationMinutes,
                table.Shape,
                table.IsActive))
            .ToArrayAsync(cancellationToken);

        var floorPlans = await dbContext.RestaurantFloorPlans
            .AsNoTracking()
            .Where(floorPlan => branchIds.Contains(floorPlan.BranchId))
            .OrderByDescending(static floorPlan => floorPlan.IsActive)
            .ThenBy(static floorPlan => floorPlan.Name)
            .Select(static floorPlan => new RestaurantFloorPlanSummary(
                floorPlan.Id,
                floorPlan.BranchId,
                floorPlan.FloorId,
                floorPlan.Name,
                floorPlan.CanvasWidth,
                floorPlan.CanvasHeight,
                floorPlan.GridSize,
                floorPlan.IsActive))
            .ToArrayAsync(cancellationToken);

        var openingHours = await dbContext.RestaurantOpeningHours
            .AsNoTracking()
            .Where(openingHour => branchIds.Contains(openingHour.BranchId))
            .OrderBy(static openingHour => openingHour.BranchId)
            .ThenBy(static openingHour => openingHour.DayOfWeek)
            .Select(static openingHour => new RestaurantOpeningHourDetail(
                openingHour.Id,
                openingHour.BranchId,
                openingHour.DayOfWeek,
                openingHour.OpensAt,
                openingHour.ClosesAt,
                openingHour.IsClosed))
            .ToArrayAsync(cancellationToken);

        var specialDays = await dbContext.RestaurantSpecialDays
            .AsNoTracking()
            .Where(specialDay => branchIds.Contains(specialDay.BranchId))
            .OrderBy(static specialDay => specialDay.Date)
            .ThenBy(static specialDay => specialDay.Name)
            .Select(static specialDay => new RestaurantSpecialDayDetail(
                specialDay.Id,
                specialDay.BranchId,
                specialDay.Date,
                specialDay.Name,
                specialDay.IsClosed,
                specialDay.OpensAt,
                specialDay.ClosesAt))
            .ToArrayAsync(cancellationToken);

        return new RestaurantSetupSnapshot(dbContext.CurrentOrganizationId, branches, floors, areas, tables, floorPlans, openingHours, specialDays);
    }

    public async Task<RestaurantSetupOperationResult> CreateBranchAsync(
        CreateRestaurantBranchRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.TimeZone))
        {
            return RestaurantSetupOperationResult.Failed(
                RestaurantSetupFailureCode.InvalidRequest,
                "Branch name and time zone are required.");
        }

        var now = timeProvider.GetUtcNow();
        var branch = new CoreBranch
        {
            OrganizationId = dbContext.CurrentOrganizationId,
            Name = request.Name.Trim(),
            Address = TrimToNull(request.Address),
            TimeZone = request.TimeZone.Trim(),
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.CoreBranches.Add(branch);
        AddDefaultOpeningHours(branch.Id, now);
        await dbContext.SaveChangesAsync(cancellationToken);

        return RestaurantSetupOperationResult.Success(ToDetail(branch));
    }

    public async Task<RestaurantSetupOperationResult> CreateFloorAsync(
        CreateRestaurantFloorRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.BranchId == Guid.Empty || string.IsNullOrWhiteSpace(request.Name))
        {
            return RestaurantSetupOperationResult.Failed(
                RestaurantSetupFailureCode.InvalidRequest,
                "Branch and floor name are required.");
        }

        if (!await BranchExistsAsync(request.BranchId, cancellationToken))
        {
            return RestaurantSetupOperationResult.Failed(RestaurantSetupFailureCode.NotFound, "Branch was not found.");
        }

        var now = timeProvider.GetUtcNow();
        var floor = new RestaurantFloor
        {
            OrganizationId = dbContext.CurrentOrganizationId,
            BranchId = request.BranchId,
            Name = request.Name.Trim(),
            SortOrder = request.SortOrder,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.RestaurantFloors.Add(floor);
        await dbContext.SaveChangesAsync(cancellationToken);

        return RestaurantSetupOperationResult.Success(ToDetail(floor));
    }

    public async Task<RestaurantSetupOperationResult> CreateAreaAsync(
        CreateRestaurantAreaRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.BranchId == Guid.Empty || request.FloorId == Guid.Empty || string.IsNullOrWhiteSpace(request.Name))
        {
            return RestaurantSetupOperationResult.Failed(
                RestaurantSetupFailureCode.InvalidRequest,
                "Branch, floor, and area name are required.");
        }

        if (!await FloorBelongsToBranchAsync(request.FloorId, request.BranchId, cancellationToken))
        {
            return RestaurantSetupOperationResult.Failed(RestaurantSetupFailureCode.NotFound, "Floor was not found.");
        }

        var now = timeProvider.GetUtcNow();
        var area = new RestaurantArea
        {
            OrganizationId = dbContext.CurrentOrganizationId,
            BranchId = request.BranchId,
            FloorId = request.FloorId,
            Name = request.Name.Trim(),
            Type = request.Type,
            SortOrder = request.SortOrder,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.RestaurantAreas.Add(area);
        await dbContext.SaveChangesAsync(cancellationToken);

        return RestaurantSetupOperationResult.Success(ToDetail(area));
    }

    public async Task<RestaurantSetupOperationResult> CreateTableAsync(
        CreateRestaurantTableRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.BranchId == Guid.Empty
            || request.FloorId == Guid.Empty
            || string.IsNullOrWhiteSpace(request.Label)
            || request.MinCapacity <= 0
            || request.MaxCapacity < request.MinCapacity)
        {
            return RestaurantSetupOperationResult.Failed(
                RestaurantSetupFailureCode.InvalidRequest,
                "Branch, floor, label, and valid capacities are required.");
        }

        if (!await FloorBelongsToBranchAsync(request.FloorId, request.BranchId, cancellationToken))
        {
            return RestaurantSetupOperationResult.Failed(RestaurantSetupFailureCode.NotFound, "Floor was not found.");
        }

        if (request.AreaId.HasValue
            && !await AreaBelongsToFloorAsync(request.AreaId.Value, request.BranchId, request.FloorId, cancellationToken))
        {
            return RestaurantSetupOperationResult.Failed(RestaurantSetupFailureCode.NotFound, "Area was not found in the selected floor.");
        }

        var now = timeProvider.GetUtcNow();
        var table = new RestaurantTable
        {
            OrganizationId = dbContext.CurrentOrganizationId,
            BranchId = request.BranchId,
            FloorId = request.FloorId,
            AreaId = request.AreaId,
            Label = request.Label.Trim(),
            MinCapacity = request.MinCapacity,
            MaxCapacity = request.MaxCapacity,
            DefaultReservationMinutes = request.DefaultReservationMinutes,
            Shape = request.Shape,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.RestaurantTables.Add(table);
        await dbContext.SaveChangesAsync(cancellationToken);

        return RestaurantSetupOperationResult.Success(ToDetail(table));
    }

    public async Task<RestaurantSetupOperationResult> CreateFloorPlanAsync(
        CreateRestaurantFloorPlanRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.BranchId == Guid.Empty
            || request.FloorId == Guid.Empty
            || string.IsNullOrWhiteSpace(request.Name)
            || request.CanvasWidth <= 0
            || request.CanvasHeight <= 0
            || request.GridSize is <= 0)
        {
            return RestaurantSetupOperationResult.Failed(
                RestaurantSetupFailureCode.InvalidRequest,
                "Branch, floor, name, and valid canvas dimensions are required.");
        }

        if (!await FloorBelongsToBranchAsync(request.FloorId, request.BranchId, cancellationToken))
        {
            return RestaurantSetupOperationResult.Failed(RestaurantSetupFailureCode.NotFound, "Floor was not found.");
        }

        var areas = await dbContext.RestaurantAreas
            .Where(area => area.BranchId == request.BranchId && area.FloorId == request.FloorId)
            .OrderBy(area => area.SortOrder)
            .ThenBy(area => area.Name)
            .ToListAsync(cancellationToken);
        var tables = await dbContext.RestaurantTables
            .Where(table => table.BranchId == request.BranchId && table.FloorId == request.FloorId)
            .OrderBy(table => table.Label)
            .ToListAsync(cancellationToken);

        var now = timeProvider.GetUtcNow();
        var floorPlan = new RestaurantFloorPlan
        {
            OrganizationId = dbContext.CurrentOrganizationId,
            BranchId = request.BranchId,
            FloorId = request.FloorId,
            Name = request.Name.Trim(),
            CanvasWidth = request.CanvasWidth,
            CanvasHeight = request.CanvasHeight,
            GridSize = request.GridSize,
            IsActive = request.IsActive,
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.RestaurantFloorPlans.Add(floorPlan);
        AddInitialAreaLayouts(floorPlan, areas, now);
        AddInitialTableLayouts(floorPlan, tables, now);
        await dbContext.SaveChangesAsync(cancellationToken);

        var detail = await LoadFloorPlanDetailAsync(floorPlan.Id, cancellationToken);
        return RestaurantSetupOperationResult.Success(detail!);
    }

    public async Task<RestaurantSetupOperationResult> UpdateBranchAsync(
        Guid branchId,
        UpdateRestaurantBranchRequest request,
        CancellationToken cancellationToken = default)
    {
        if (branchId == Guid.Empty || string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.TimeZone))
        {
            return RestaurantSetupOperationResult.Failed(
                RestaurantSetupFailureCode.InvalidRequest,
                "Branch name and time zone are required.");
        }

        var branch = await dbContext.CoreBranches.SingleOrDefaultAsync(branch => branch.Id == branchId, cancellationToken);
        if (branch is null)
        {
            return RestaurantSetupOperationResult.Failed(RestaurantSetupFailureCode.NotFound, "Branch was not found.");
        }

        branch.Name = request.Name.Trim();
        branch.Address = TrimToNull(request.Address);
        branch.TimeZone = request.TimeZone.Trim();
        branch.IsActive = request.IsActive;
        branch.UpdatedAt = timeProvider.GetUtcNow();
        await dbContext.SaveChangesAsync(cancellationToken);

        return RestaurantSetupOperationResult.Success(ToDetail(branch));
    }

    public async Task<RestaurantSetupOperationResult> UpdateFloorAsync(
        Guid floorId,
        UpdateRestaurantFloorRequest request,
        CancellationToken cancellationToken = default)
    {
        if (floorId == Guid.Empty || request.BranchId == Guid.Empty || string.IsNullOrWhiteSpace(request.Name))
        {
            return RestaurantSetupOperationResult.Failed(
                RestaurantSetupFailureCode.InvalidRequest,
                "Branch and floor name are required.");
        }

        if (!await BranchExistsAsync(request.BranchId, cancellationToken))
        {
            return RestaurantSetupOperationResult.Failed(RestaurantSetupFailureCode.NotFound, "Branch was not found.");
        }

        var floor = await dbContext.RestaurantFloors.SingleOrDefaultAsync(floor => floor.Id == floorId, cancellationToken);
        if (floor is null)
        {
            return RestaurantSetupOperationResult.Failed(RestaurantSetupFailureCode.NotFound, "Floor was not found.");
        }

        floor.BranchId = request.BranchId;
        floor.Name = request.Name.Trim();
        floor.SortOrder = request.SortOrder;
        floor.IsActive = request.IsActive;
        floor.UpdatedAt = timeProvider.GetUtcNow();
        await dbContext.SaveChangesAsync(cancellationToken);

        return RestaurantSetupOperationResult.Success(ToDetail(floor));
    }

    public async Task<RestaurantSetupOperationResult> UpdateAreaAsync(
        Guid areaId,
        UpdateRestaurantAreaRequest request,
        CancellationToken cancellationToken = default)
    {
        if (areaId == Guid.Empty || request.BranchId == Guid.Empty || request.FloorId == Guid.Empty || string.IsNullOrWhiteSpace(request.Name))
        {
            return RestaurantSetupOperationResult.Failed(
                RestaurantSetupFailureCode.InvalidRequest,
                "Branch, floor, and area name are required.");
        }

        if (!await FloorBelongsToBranchAsync(request.FloorId, request.BranchId, cancellationToken))
        {
            return RestaurantSetupOperationResult.Failed(RestaurantSetupFailureCode.NotFound, "Floor was not found.");
        }

        var area = await dbContext.RestaurantAreas.SingleOrDefaultAsync(area => area.Id == areaId, cancellationToken);
        if (area is null)
        {
            return RestaurantSetupOperationResult.Failed(RestaurantSetupFailureCode.NotFound, "Area was not found.");
        }

        area.BranchId = request.BranchId;
        area.FloorId = request.FloorId;
        area.Name = request.Name.Trim();
        area.Type = request.Type;
        area.SortOrder = request.SortOrder;
        area.IsActive = request.IsActive;
        area.UpdatedAt = timeProvider.GetUtcNow();
        await dbContext.SaveChangesAsync(cancellationToken);

        return RestaurantSetupOperationResult.Success(ToDetail(area));
    }

    public async Task<RestaurantSetupOperationResult> UpdateTableAsync(
        Guid tableId,
        UpdateRestaurantTableRequest request,
        CancellationToken cancellationToken = default)
    {
        if (tableId == Guid.Empty
            || request.BranchId == Guid.Empty
            || request.FloorId == Guid.Empty
            || string.IsNullOrWhiteSpace(request.Label)
            || request.MinCapacity <= 0
            || request.MaxCapacity < request.MinCapacity)
        {
            return RestaurantSetupOperationResult.Failed(
                RestaurantSetupFailureCode.InvalidRequest,
                "Branch, floor, label, and valid capacities are required.");
        }

        if (!await FloorBelongsToBranchAsync(request.FloorId, request.BranchId, cancellationToken))
        {
            return RestaurantSetupOperationResult.Failed(RestaurantSetupFailureCode.NotFound, "Floor was not found.");
        }

        if (request.AreaId.HasValue
            && !await AreaBelongsToFloorAsync(request.AreaId.Value, request.BranchId, request.FloorId, cancellationToken))
        {
            return RestaurantSetupOperationResult.Failed(RestaurantSetupFailureCode.NotFound, "Area was not found in the selected floor.");
        }

        var table = await dbContext.RestaurantTables.SingleOrDefaultAsync(table => table.Id == tableId, cancellationToken);
        if (table is null)
        {
            return RestaurantSetupOperationResult.Failed(RestaurantSetupFailureCode.NotFound, "Table was not found.");
        }

        var now = timeProvider.GetUtcNow();
        table.BranchId = request.BranchId;
        table.FloorId = request.FloorId;
        table.AreaId = request.AreaId;
        table.Label = request.Label.Trim();
        table.MinCapacity = request.MinCapacity;
        table.MaxCapacity = request.MaxCapacity;
        table.DefaultReservationMinutes = request.DefaultReservationMinutes;
        table.Shape = request.Shape;
        table.IsActive = request.IsActive;
        table.UpdatedAt = now;

        var tableLayouts = await dbContext.RestaurantTableLayouts
            .Where(layout => layout.TableId == tableId)
            .ToListAsync(cancellationToken);
        foreach (var layout in tableLayouts)
        {
            layout.Shape = request.Shape;
            layout.UpdatedAt = now;
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        return RestaurantSetupOperationResult.Success(ToDetail(table));
    }

    public async Task<RestaurantSetupOperationResult> UpdateFloorPlanMetadataAsync(
        Guid floorPlanId,
        UpdateRestaurantFloorPlanMetadataRequest request,
        CancellationToken cancellationToken = default)
    {
        if (floorPlanId == Guid.Empty
            || request.BranchId == Guid.Empty
            || request.FloorId == Guid.Empty
            || string.IsNullOrWhiteSpace(request.Name)
            || request.CanvasWidth <= 0
            || request.CanvasHeight <= 0
            || request.GridSize is <= 0)
        {
            return RestaurantSetupOperationResult.Failed(
                RestaurantSetupFailureCode.InvalidRequest,
                "Branch, floor, name, and valid canvas dimensions are required.");
        }

        if (!await FloorBelongsToBranchAsync(request.FloorId, request.BranchId, cancellationToken))
        {
            return RestaurantSetupOperationResult.Failed(RestaurantSetupFailureCode.NotFound, "Floor was not found.");
        }

        var floorPlan = await dbContext.RestaurantFloorPlans.SingleOrDefaultAsync(plan => plan.Id == floorPlanId, cancellationToken);
        if (floorPlan is null)
        {
            return RestaurantSetupOperationResult.Failed(RestaurantSetupFailureCode.NotFound, "Floor plan was not found.");
        }

        floorPlan.BranchId = request.BranchId;
        floorPlan.FloorId = request.FloorId;
        floorPlan.Name = request.Name.Trim();
        floorPlan.CanvasWidth = request.CanvasWidth;
        floorPlan.CanvasHeight = request.CanvasHeight;
        floorPlan.GridSize = request.GridSize;
        floorPlan.IsActive = request.IsActive;
        floorPlan.UpdatedAt = timeProvider.GetUtcNow();
        await dbContext.SaveChangesAsync(cancellationToken);

        return RestaurantSetupOperationResult.Success(ToSummary(floorPlan));
    }

    public async Task<RestaurantSetupOperationResult> UpsertOpeningHourAsync(
        UpsertRestaurantOpeningHourRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.BranchId == Guid.Empty || (!request.IsClosed && request.ClosesAt <= request.OpensAt))
        {
            return RestaurantSetupOperationResult.Failed(
                RestaurantSetupFailureCode.InvalidRequest,
                "Branch and valid opening hours are required.");
        }

        if (!await BranchExistsAsync(request.BranchId, cancellationToken))
        {
            return RestaurantSetupOperationResult.Failed(RestaurantSetupFailureCode.NotFound, "Branch was not found.");
        }

        var openingHour = await dbContext.RestaurantOpeningHours.SingleOrDefaultAsync(
            hours => hours.BranchId == request.BranchId && hours.DayOfWeek == request.DayOfWeek,
            cancellationToken);
        var now = timeProvider.GetUtcNow();

        if (openingHour is null)
        {
            openingHour = new RestaurantOpeningHour
            {
                OrganizationId = dbContext.CurrentOrganizationId,
                BranchId = request.BranchId,
                DayOfWeek = request.DayOfWeek,
                CreatedAt = now
            };
            dbContext.RestaurantOpeningHours.Add(openingHour);
        }

        openingHour.OpensAt = request.OpensAt;
        openingHour.ClosesAt = request.ClosesAt;
        openingHour.IsClosed = request.IsClosed;
        openingHour.UpdatedAt = now;
        await dbContext.SaveChangesAsync(cancellationToken);

        return RestaurantSetupOperationResult.Success(ToDetail(openingHour));
    }

    public async Task<RestaurantSetupOperationResult> UpsertSpecialDayAsync(
        UpsertRestaurantSpecialDayRequest request,
        CancellationToken cancellationToken = default)
    {
        if (request.BranchId == Guid.Empty
            || string.IsNullOrWhiteSpace(request.Name)
            || (!request.IsClosed && (!request.OpensAt.HasValue || !request.ClosesAt.HasValue || request.ClosesAt <= request.OpensAt)))
        {
            return RestaurantSetupOperationResult.Failed(
                RestaurantSetupFailureCode.InvalidRequest,
                "Branch, date, name, and valid special-day hours are required.");
        }

        if (!await BranchExistsAsync(request.BranchId, cancellationToken))
        {
            return RestaurantSetupOperationResult.Failed(RestaurantSetupFailureCode.NotFound, "Branch was not found.");
        }

        RestaurantSpecialDay? specialDay = null;
        if (request.Id.HasValue)
        {
            specialDay = await dbContext.RestaurantSpecialDays.SingleOrDefaultAsync(day => day.Id == request.Id.Value, cancellationToken);
            if (specialDay is null)
            {
                return RestaurantSetupOperationResult.Failed(RestaurantSetupFailureCode.NotFound, "Special day was not found.");
            }
        }

        specialDay ??= await dbContext.RestaurantSpecialDays.SingleOrDefaultAsync(
            day => day.BranchId == request.BranchId && day.Date == request.Date,
            cancellationToken);

        var now = timeProvider.GetUtcNow();
        if (specialDay is null)
        {
            specialDay = new RestaurantSpecialDay
            {
                OrganizationId = dbContext.CurrentOrganizationId,
                CreatedAt = now
            };
            dbContext.RestaurantSpecialDays.Add(specialDay);
        }

        specialDay.BranchId = request.BranchId;
        specialDay.Date = request.Date;
        specialDay.Name = request.Name.Trim();
        specialDay.IsClosed = request.IsClosed;
        specialDay.OpensAt = request.IsClosed ? null : request.OpensAt;
        specialDay.ClosesAt = request.IsClosed ? null : request.ClosesAt;
        specialDay.UpdatedAt = now;
        await dbContext.SaveChangesAsync(cancellationToken);

        return RestaurantSetupOperationResult.Success(ToDetail(specialDay));
    }

    public async Task<RestaurantSetupOperationResult> DeleteBranchAsync(Guid branchId, CancellationToken cancellationToken = default)
    {
        var branch = await dbContext.CoreBranches.SingleOrDefaultAsync(branch => branch.Id == branchId, cancellationToken);
        if (branch is null)
        {
            return RestaurantSetupOperationResult.Failed(RestaurantSetupFailureCode.NotFound, "Branch was not found.");
        }

        await DeleteBranchDependentsAsync(branchId, cancellationToken);
        dbContext.CoreBranches.Remove(branch);
        await dbContext.SaveChangesAsync(cancellationToken);
        return RestaurantSetupOperationResult.Success();
    }

    public async Task<RestaurantSetupOperationResult> DeleteFloorAsync(Guid floorId, CancellationToken cancellationToken = default)
    {
        var floor = await dbContext.RestaurantFloors.SingleOrDefaultAsync(floor => floor.Id == floorId, cancellationToken);
        if (floor is null)
        {
            return RestaurantSetupOperationResult.Failed(RestaurantSetupFailureCode.NotFound, "Floor was not found.");
        }

        await DeleteFloorDependentsAsync(floorId, cancellationToken);
        dbContext.RestaurantFloors.Remove(floor);
        await dbContext.SaveChangesAsync(cancellationToken);
        return RestaurantSetupOperationResult.Success();
    }

    public async Task<RestaurantSetupOperationResult> DeleteAreaAsync(Guid areaId, CancellationToken cancellationToken = default)
    {
        var area = await dbContext.RestaurantAreas.SingleOrDefaultAsync(area => area.Id == areaId, cancellationToken);
        if (area is null)
        {
            return RestaurantSetupOperationResult.Failed(RestaurantSetupFailureCode.NotFound, "Area was not found.");
        }

        var areaLayouts = await dbContext.RestaurantAreaLayouts.Where(layout => layout.AreaId == areaId).ToListAsync(cancellationToken);
        var areaBlocks = await dbContext.RestaurantTableBlocks.Where(block => block.AreaId == areaId).ToListAsync(cancellationToken);
        var tables = await dbContext.RestaurantTables.Where(table => table.AreaId == areaId).ToListAsync(cancellationToken);
        foreach (var table in tables)
        {
            table.AreaId = null;
            table.UpdatedAt = timeProvider.GetUtcNow();
        }

        dbContext.RestaurantAreaLayouts.RemoveRange(areaLayouts);
        dbContext.RestaurantTableBlocks.RemoveRange(areaBlocks);
        dbContext.RestaurantAreas.Remove(area);
        await dbContext.SaveChangesAsync(cancellationToken);
        return RestaurantSetupOperationResult.Success();
    }

    public async Task<RestaurantSetupOperationResult> DeleteTableAsync(Guid tableId, CancellationToken cancellationToken = default)
    {
        var table = await dbContext.RestaurantTables.SingleOrDefaultAsync(table => table.Id == tableId, cancellationToken);
        if (table is null)
        {
            return RestaurantSetupOperationResult.Failed(RestaurantSetupFailureCode.NotFound, "Table was not found.");
        }

        await DeleteTableDependentsAsync(tableId, cancellationToken);
        dbContext.RestaurantTables.Remove(table);
        await dbContext.SaveChangesAsync(cancellationToken);
        return RestaurantSetupOperationResult.Success();
    }

    public async Task<RestaurantSetupOperationResult> DeleteFloorPlanAsync(Guid floorPlanId, CancellationToken cancellationToken = default)
    {
        var floorPlan = await dbContext.RestaurantFloorPlans.SingleOrDefaultAsync(floorPlan => floorPlan.Id == floorPlanId, cancellationToken);
        if (floorPlan is null)
        {
            return RestaurantSetupOperationResult.Failed(RestaurantSetupFailureCode.NotFound, "Floor plan was not found.");
        }

        await DeleteFloorPlanDependentsAsync(floorPlanId, cancellationToken);
        dbContext.RestaurantFloorPlans.Remove(floorPlan);
        await dbContext.SaveChangesAsync(cancellationToken);
        return RestaurantSetupOperationResult.Success();
    }

    public async Task<RestaurantSetupOperationResult> DeleteSpecialDayAsync(Guid specialDayId, CancellationToken cancellationToken = default)
    {
        var specialDay = await dbContext.RestaurantSpecialDays.SingleOrDefaultAsync(day => day.Id == specialDayId, cancellationToken);
        if (specialDay is null)
        {
            return RestaurantSetupOperationResult.Failed(RestaurantSetupFailureCode.NotFound, "Special day was not found.");
        }

        dbContext.RestaurantSpecialDays.Remove(specialDay);
        await dbContext.SaveChangesAsync(cancellationToken);
        return RestaurantSetupOperationResult.Success();
    }

    private async Task<RestaurantFloorPlanDetail?> LoadFloorPlanDetailAsync(Guid floorPlanId, CancellationToken cancellationToken)
    {
        var floorPlan = await dbContext.RestaurantFloorPlans
            .AsNoTracking()
            .Where(plan => plan.Id == floorPlanId)
            .Include(plan => plan.AreaLayouts)
            .ThenInclude(layout => layout.Area)
            .Include(plan => plan.TableLayouts)
            .ThenInclude(layout => layout.Table)
            .Include(plan => plan.TableLayouts)
            .ThenInclude(layout => layout.SeatLayouts)
            .SingleOrDefaultAsync(cancellationToken);

        if (floorPlan is null)
        {
            return null;
        }

        return new RestaurantFloorPlanDetail(
            floorPlan.Id,
            floorPlan.BranchId,
            floorPlan.FloorId,
            floorPlan.Name,
            floorPlan.CanvasWidth,
            floorPlan.CanvasHeight,
            floorPlan.GridSize,
            floorPlan.IsActive,
            floorPlan.AreaLayouts
                .OrderBy(static layout => layout.ZIndex)
                .Select(static layout => new RestaurantAreaLayoutDetail(
                    layout.AreaId,
                    layout.Area!.Name,
                    layout.X,
                    layout.Y,
                    layout.Width,
                    layout.Height,
                    layout.RotationDegrees,
                    layout.ZIndex))
                .ToArray(),
            floorPlan.TableLayouts
                .OrderBy(static layout => layout.ZIndex)
                .Select(static layout => new RestaurantTableLayoutDetail(
                    layout.TableId,
                    layout.Table!.Label,
                    layout.Table.AreaId,
                    layout.X,
                    layout.Y,
                    layout.Width,
                    layout.Height,
                    layout.RotationDegrees,
                    layout.Shape,
                    layout.ZIndex,
                    layout.SeatLayouts
                        .OrderBy(static seat => seat.SeatNumber)
                        .Select(static seat => new RestaurantTableSeatLayoutDetail(
                            seat.SeatNumber,
                            seat.X,
                            seat.Y,
                            seat.RotationDegrees))
                        .ToArray()))
                .ToArray());
    }

    private void AddDefaultOpeningHours(Guid branchId, DateTimeOffset now)
    {
        foreach (var dayOfWeek in Enum.GetValues<DayOfWeek>())
        {
            dbContext.RestaurantOpeningHours.Add(new RestaurantOpeningHour
            {
                OrganizationId = dbContext.CurrentOrganizationId,
                BranchId = branchId,
                DayOfWeek = dayOfWeek,
                OpensAt = new TimeOnly(11, 0),
                ClosesAt = new TimeOnly(23, 0),
                IsClosed = false,
                CreatedAt = now,
                UpdatedAt = now
            });
        }
    }

    private async Task DeleteBranchDependentsAsync(Guid branchId, CancellationToken cancellationToken)
    {
        var floorPlanIds = await dbContext.RestaurantFloorPlans
            .AsNoTracking()
            .Where(floorPlan => floorPlan.BranchId == branchId)
            .Select(floorPlan => floorPlan.Id)
            .ToArrayAsync(cancellationToken);
        foreach (var floorPlanId in floorPlanIds)
        {
            await DeleteFloorPlanDependentsAsync(floorPlanId, cancellationToken);
        }

        var tableIds = await dbContext.RestaurantTables
            .AsNoTracking()
            .Where(table => table.BranchId == branchId)
            .Select(table => table.Id)
            .ToArrayAsync(cancellationToken);
        foreach (var tableId in tableIds)
        {
            await DeleteTableDependentsAsync(tableId, cancellationToken);
        }

        var reservations = await dbContext.RestaurantReservations
            .Where(reservation => reservation.BranchId == branchId)
            .ToListAsync(cancellationToken);
        var reservationIds = reservations.Select(static reservation => reservation.Id).ToArray();
        var statusHistory = await dbContext.RestaurantReservationStatusHistory
            .Where(history => reservationIds.Contains(history.ReservationId))
            .ToListAsync(cancellationToken);
        var reservationTables = await dbContext.RestaurantReservationTables
            .Where(reservationTable => reservationIds.Contains(reservationTable.ReservationId))
            .ToListAsync(cancellationToken);

        dbContext.RestaurantReservationStatusHistory.RemoveRange(statusHistory);
        dbContext.RestaurantReservationTables.RemoveRange(reservationTables);
        dbContext.RestaurantReservations.RemoveRange(reservations);

        dbContext.RestaurantTableBlocks.RemoveRange(await dbContext.RestaurantTableBlocks.Where(block => block.BranchId == branchId).ToListAsync(cancellationToken));
        dbContext.RestaurantFloorPlans.RemoveRange(await dbContext.RestaurantFloorPlans.Where(plan => plan.BranchId == branchId).ToListAsync(cancellationToken));
        dbContext.RestaurantTables.RemoveRange(await dbContext.RestaurantTables.Where(table => table.BranchId == branchId).ToListAsync(cancellationToken));
        dbContext.RestaurantAreas.RemoveRange(await dbContext.RestaurantAreas.Where(area => area.BranchId == branchId).ToListAsync(cancellationToken));
        dbContext.RestaurantFloors.RemoveRange(await dbContext.RestaurantFloors.Where(floor => floor.BranchId == branchId).ToListAsync(cancellationToken));
        dbContext.RestaurantOpeningHours.RemoveRange(await dbContext.RestaurantOpeningHours.Where(hours => hours.BranchId == branchId).ToListAsync(cancellationToken));
        dbContext.RestaurantSpecialDays.RemoveRange(await dbContext.RestaurantSpecialDays.Where(day => day.BranchId == branchId).ToListAsync(cancellationToken));
    }

    private async Task DeleteFloorDependentsAsync(Guid floorId, CancellationToken cancellationToken)
    {
        var floorPlanIds = await dbContext.RestaurantFloorPlans
            .AsNoTracking()
            .Where(floorPlan => floorPlan.FloorId == floorId)
            .Select(floorPlan => floorPlan.Id)
            .ToArrayAsync(cancellationToken);
        foreach (var floorPlanId in floorPlanIds)
        {
            await DeleteFloorPlanDependentsAsync(floorPlanId, cancellationToken);
        }

        var tableIds = await dbContext.RestaurantTables
            .AsNoTracking()
            .Where(table => table.FloorId == floorId)
            .Select(table => table.Id)
            .ToArrayAsync(cancellationToken);
        foreach (var tableId in tableIds)
        {
            await DeleteTableDependentsAsync(tableId, cancellationToken);
        }

        dbContext.RestaurantTableBlocks.RemoveRange(await dbContext.RestaurantTableBlocks.Where(block => block.FloorId == floorId).ToListAsync(cancellationToken));
        dbContext.RestaurantFloorPlans.RemoveRange(await dbContext.RestaurantFloorPlans.Where(plan => plan.FloorId == floorId).ToListAsync(cancellationToken));
        dbContext.RestaurantTables.RemoveRange(await dbContext.RestaurantTables.Where(table => table.FloorId == floorId).ToListAsync(cancellationToken));
        dbContext.RestaurantAreas.RemoveRange(await dbContext.RestaurantAreas.Where(area => area.FloorId == floorId).ToListAsync(cancellationToken));
    }

    private async Task DeleteTableDependentsAsync(Guid tableId, CancellationToken cancellationToken)
    {
        var tableLayouts = await dbContext.RestaurantTableLayouts
            .Where(layout => layout.TableId == tableId)
            .ToListAsync(cancellationToken);
        var tableLayoutIds = tableLayouts.Select(static layout => layout.Id).ToArray();
        dbContext.RestaurantTableSeatLayouts.RemoveRange(await dbContext.RestaurantTableSeatLayouts
            .Where(seat => tableLayoutIds.Contains(seat.TableLayoutId))
            .ToListAsync(cancellationToken));
        dbContext.RestaurantTableLayouts.RemoveRange(tableLayouts);
        dbContext.RestaurantReservationTables.RemoveRange(await dbContext.RestaurantReservationTables
            .Where(reservationTable => reservationTable.TableId == tableId)
            .ToListAsync(cancellationToken));
        dbContext.RestaurantTableBlocks.RemoveRange(await dbContext.RestaurantTableBlocks
            .Where(block => block.TableId == tableId)
            .ToListAsync(cancellationToken));
    }

    private async Task DeleteFloorPlanDependentsAsync(Guid floorPlanId, CancellationToken cancellationToken)
    {
        var tableLayouts = await dbContext.RestaurantTableLayouts
            .Where(layout => layout.FloorPlanId == floorPlanId)
            .ToListAsync(cancellationToken);
        var tableLayoutIds = tableLayouts.Select(static layout => layout.Id).ToArray();
        dbContext.RestaurantTableSeatLayouts.RemoveRange(await dbContext.RestaurantTableSeatLayouts
            .Where(seat => tableLayoutIds.Contains(seat.TableLayoutId))
            .ToListAsync(cancellationToken));
        dbContext.RestaurantTableLayouts.RemoveRange(tableLayouts);
        dbContext.RestaurantAreaLayouts.RemoveRange(await dbContext.RestaurantAreaLayouts
            .Where(layout => layout.FloorPlanId == floorPlanId)
            .ToListAsync(cancellationToken));
    }

    private void AddInitialAreaLayouts(RestaurantFloorPlan floorPlan, IReadOnlyList<RestaurantArea> areas, DateTimeOffset now)
    {
        for (var index = 0; index < areas.Count; index++)
        {
            dbContext.RestaurantAreaLayouts.Add(new RestaurantAreaLayout
            {
                OrganizationId = dbContext.CurrentOrganizationId,
                FloorPlan = floorPlan,
                AreaId = areas[index].Id,
                X = 24 + (index * 24),
                Y = 24 + (index * 24),
                Width = Math.Max(240, floorPlan.CanvasWidth - 96),
                Height = Math.Max(180, floorPlan.CanvasHeight - 96),
                RotationDegrees = 0,
                ZIndex = index + 1,
                CreatedAt = now,
                UpdatedAt = now
            });
        }
    }

    private void AddInitialTableLayouts(RestaurantFloorPlan floorPlan, IReadOnlyList<RestaurantTable> tables, DateTimeOffset now)
    {
        for (var index = 0; index < tables.Count; index++)
        {
            var table = tables[index];
            var column = index % 5;
            var row = index / 5;
            var width = table.Shape is RestaurantTableShape.Round or RestaurantTableShape.Square ? 72 : 96;
            var height = table.Shape is RestaurantTableShape.Round or RestaurantTableShape.Square ? 72 : 64;
            var layout = new RestaurantTableLayout
            {
                OrganizationId = dbContext.CurrentOrganizationId,
                FloorPlan = floorPlan,
                TableId = table.Id,
                X = 80 + (column * 130),
                Y = 90 + (row * 110),
                Width = width,
                Height = height,
                RotationDegrees = 0,
                Shape = table.Shape,
                ZIndex = 100 + index,
                CreatedAt = now,
                UpdatedAt = now
            };

            dbContext.RestaurantTableLayouts.Add(layout);
            AddInitialSeatLayouts(layout, table.MaxCapacity, now);
        }
    }

    private void AddInitialSeatLayouts(RestaurantTableLayout layout, int seatCount, DateTimeOffset now)
    {
        for (var seatNumber = 1; seatNumber <= Math.Max(1, seatCount); seatNumber++)
        {
            var zeroBased = seatNumber - 1;
            dbContext.RestaurantTableSeatLayouts.Add(new RestaurantTableSeatLayout
            {
                OrganizationId = dbContext.CurrentOrganizationId,
                TableLayout = layout,
                SeatNumber = seatNumber,
                X = 12 + ((zeroBased % 2) * Math.Max(24, layout.Width - 24)),
                Y = 12 + ((zeroBased / 2) * 24),
                RotationDegrees = 0,
                CreatedAt = now,
                UpdatedAt = now
            });
        }
    }

    private Task<bool> BranchExistsAsync(Guid branchId, CancellationToken cancellationToken)
    {
        return dbContext.CoreBranches
            .AsNoTracking()
            .AnyAsync(branch => branch.Id == branchId, cancellationToken);
    }

    private Task<bool> FloorBelongsToBranchAsync(Guid floorId, Guid branchId, CancellationToken cancellationToken)
    {
        return dbContext.RestaurantFloors
            .AsNoTracking()
            .AnyAsync(
                floor => floor.Id == floorId && floor.BranchId == branchId,
                cancellationToken);
    }

    private Task<bool> AreaBelongsToFloorAsync(Guid areaId, Guid branchId, Guid floorId, CancellationToken cancellationToken)
    {
        return dbContext.RestaurantAreas
            .AsNoTracking()
            .AnyAsync(
                area => area.Id == areaId && area.BranchId == branchId && area.FloorId == floorId,
                cancellationToken);
    }

    private static string? TrimToNull(string? value)
    {
        var trimmed = value?.Trim();
        return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
    }

    private static RestaurantBranchDetail ToDetail(CoreBranch branch)
    {
        return new RestaurantBranchDetail(branch.Id, branch.OrganizationId, branch.Name, branch.Address, branch.TimeZone, branch.IsActive);
    }

    private static RestaurantFloorDetail ToDetail(RestaurantFloor floor)
    {
        return new RestaurantFloorDetail(floor.Id, floor.BranchId, floor.Name, floor.SortOrder, floor.IsActive);
    }

    private static RestaurantAreaDetail ToDetail(RestaurantArea area)
    {
        return new RestaurantAreaDetail(area.Id, area.BranchId, area.FloorId, area.Name, area.Type, area.SortOrder, area.IsActive);
    }

    private static RestaurantTableDetail ToDetail(RestaurantTable table)
    {
        return new RestaurantTableDetail(
            table.Id,
            table.OrganizationId,
            table.BranchId,
            table.FloorId,
            table.AreaId,
            table.Label,
            table.MinCapacity,
            table.MaxCapacity,
            table.DefaultReservationMinutes,
            table.Shape,
            table.IsActive);
    }

    private static RestaurantFloorPlanSummary ToSummary(RestaurantFloorPlan floorPlan)
    {
        return new RestaurantFloorPlanSummary(
            floorPlan.Id,
            floorPlan.BranchId,
            floorPlan.FloorId,
            floorPlan.Name,
            floorPlan.CanvasWidth,
            floorPlan.CanvasHeight,
            floorPlan.GridSize,
            floorPlan.IsActive);
    }

    private static RestaurantOpeningHourDetail ToDetail(RestaurantOpeningHour openingHour)
    {
        return new RestaurantOpeningHourDetail(
            openingHour.Id,
            openingHour.BranchId,
            openingHour.DayOfWeek,
            openingHour.OpensAt,
            openingHour.ClosesAt,
            openingHour.IsClosed);
    }

    private static RestaurantSpecialDayDetail ToDetail(RestaurantSpecialDay specialDay)
    {
        return new RestaurantSpecialDayDetail(
            specialDay.Id,
            specialDay.BranchId,
            specialDay.Date,
            specialDay.Name,
            specialDay.IsClosed,
            specialDay.OpensAt,
            specialDay.ClosesAt);
    }
}
