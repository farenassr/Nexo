using Microsoft.EntityFrameworkCore;
using Nexo.Server.Data;
using Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;
using Nexo.Server.Modules.Restaurant.Data.Extensions;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.FloorPlans;

public sealed class RestaurantFloorPlanService(NexoDbContext dbContext, TimeProvider timeProvider)
{
    private static readonly RestaurantReservationStatus[] ReservedStatuses =
    [
        RestaurantReservationStatus.Pending,
        RestaurantReservationStatus.Confirmed
    ];

    public async Task<IReadOnlyCollection<RestaurantFloorPlanSummary>> ListAsync(
        RestaurantFloorPlanListRequest request,
        CancellationToken cancellationToken = default)
    {
        return await dbContext.RestaurantFloorPlans
            .AsNoTracking()
            .Where(floorPlan => floorPlan.BranchId == request.BranchId && floorPlan.FloorId == request.FloorId)
            .OrderByDescending(floorPlan => floorPlan.IsActive)
            .ThenBy(floorPlan => floorPlan.Name)
            .Select(floorPlan => new RestaurantFloorPlanSummary(
                floorPlan.Id,
                floorPlan.BranchId,
                floorPlan.FloorId,
                floorPlan.Name,
                floorPlan.CanvasWidth,
                floorPlan.CanvasHeight,
                floorPlan.GridSize,
                floorPlan.IsActive))
            .ToArrayAsync(cancellationToken);
    }

    public async Task<RestaurantFloorPlanDetail?> GetDetailAsync(
        Guid floorPlanId,
        CancellationToken cancellationToken = default)
    {
        var floorPlan = await GetFloorPlanAggregate(floorPlanId)
            .AsNoTracking()
            .SingleOrDefaultAsync(cancellationToken);

        return floorPlan is null ? null : ToDetail(floorPlan);
    }

    public async Task<RestaurantFloorPlanOperationResult> SaveAsync(
        Guid floorPlanId,
        SaveRestaurantFloorPlanRequest request,
        CancellationToken cancellationToken = default)
    {
        if (!IsValid(request))
        {
            return RestaurantFloorPlanOperationResult.Failed(
                RestaurantFloorPlanFailureCode.InvalidRequest,
                "Floor plan metadata and layout dimensions must be valid.");
        }

        var floorPlan = await dbContext.RestaurantFloorPlans
            .SingleOrDefaultAsync(plan => plan.Id == floorPlanId, cancellationToken);

        if (floorPlan is null)
        {
            return RestaurantFloorPlanOperationResult.Failed(
                RestaurantFloorPlanFailureCode.NotFound,
                "Floor plan was not found.");
        }

        if (!await LayoutReferencesMatchFloorPlanAsync(floorPlan, request, cancellationToken))
        {
            return RestaurantFloorPlanOperationResult.Failed(
                RestaurantFloorPlanFailureCode.NotFound,
                "One or more layout references do not belong to the floor plan.");
        }

        await ReplaceLayoutsAsync(floorPlan, request, cancellationToken);

        var now = timeProvider.GetUtcNow();
        floorPlan.Name = request.Name.Trim();
        floorPlan.CanvasWidth = request.CanvasWidth;
        floorPlan.CanvasHeight = request.CanvasHeight;
        floorPlan.GridSize = request.GridSize;
        floorPlan.IsActive = request.IsActive;
        floorPlan.UpdatedAt = now;

        await dbContext.SaveChangesAsync(cancellationToken);
        return RestaurantFloorPlanOperationResult.Success((await GetDetailAsync(floorPlanId, cancellationToken))!);
    }

    public async Task<RestaurantFloorPlanOperationResult> UpdateTableLayoutAsync(
        Guid floorPlanId,
        Guid tableId,
        SaveRestaurantTableLayoutRequest request,
        CancellationToken cancellationToken = default)
    {
        if (tableId != request.TableId || !IsValid(request))
        {
            return RestaurantFloorPlanOperationResult.Failed(
                RestaurantFloorPlanFailureCode.InvalidRequest,
                "Table layout dimensions must be valid.");
        }

        var floorPlan = await dbContext.RestaurantFloorPlans
            .SingleOrDefaultAsync(plan => plan.Id == floorPlanId, cancellationToken);

        if (floorPlan is null)
        {
            return RestaurantFloorPlanOperationResult.Failed(
                RestaurantFloorPlanFailureCode.NotFound,
                "Floor plan was not found.");
        }

        var table = await dbContext.RestaurantTables
            .SingleOrDefaultAsync(candidate => candidate.Id == tableId
                && candidate.BranchId == floorPlan.BranchId
                && candidate.FloorId == floorPlan.FloorId,
                cancellationToken);

        if (table is null)
        {
            return RestaurantFloorPlanOperationResult.Failed(
                RestaurantFloorPlanFailureCode.NotFound,
                "Table was not found in the floor plan.");
        }

        var now = timeProvider.GetUtcNow();
        var layout = await dbContext.RestaurantTableLayouts
            .SingleOrDefaultAsync(candidate => candidate.FloorPlanId == floorPlanId && candidate.TableId == tableId, cancellationToken);

        if (layout is null)
        {
            layout = new RestaurantTableLayout
            {
                OrganizationId = dbContext.CurrentOrganizationId,
                FloorPlanId = floorPlanId,
                TableId = tableId,
                CreatedAt = now
            };
            dbContext.RestaurantTableLayouts.Add(layout);
        }
        else
        {
            var seats = await dbContext.RestaurantTableSeatLayouts
                .Where(seat => seat.TableLayoutId == layout.Id)
                .ToListAsync(cancellationToken);
            dbContext.RestaurantTableSeatLayouts.RemoveRange(seats);
        }

        ApplyTableLayout(layout, request, now);
        floorPlan.UpdatedAt = now;
        AddSeatLayouts(layout, request.SeatLayouts, now);

        await dbContext.SaveChangesAsync(cancellationToken);
        return RestaurantFloorPlanOperationResult.Success((await GetDetailAsync(floorPlanId, cancellationToken))!);
    }

    public async Task<RestaurantFloorPlanStatusMap?> GetStatusMapAsync(
        RestaurantFloorPlanStatusMapRequest request,
        CancellationToken cancellationToken = default)
    {
        var floorPlan = await dbContext.RestaurantFloorPlans
            .AsNoTracking()
            .SingleOrDefaultAsync(plan => plan.Id == request.FloorPlanId, cancellationToken);

        if (floorPlan is null)
        {
            return null;
        }

        var layouts = await dbContext.RestaurantTableLayouts
            .AsNoTracking()
            .Where(layout => layout.FloorPlanId == floorPlan.Id)
            .Include(layout => layout.Table)
            .Where(layout => !request.AreaId.HasValue || layout.Table!.AreaId == request.AreaId.Value)
            .OrderBy(layout => layout.ZIndex)
            .ThenBy(layout => layout.Table!.Label)
            .ToListAsync(cancellationToken);

        var tableIds = layouts.Select(static layout => layout.TableId).ToArray();
        var areaIds = layouts
            .Where(static layout => layout.Table!.AreaId.HasValue)
            .Select(static layout => layout.Table!.AreaId!.Value)
            .Distinct()
            .ToArray();

        var blocks = await dbContext.RestaurantTableBlocks
            .AsNoTracking()
            .ActiveOnly()
            .Where(block => block.BranchId == floorPlan.BranchId
                && block.StartAt <= request.At
                && block.EndAt > request.At
                && ((block.TableId.HasValue && tableIds.Contains(block.TableId.Value))
                    || block.FloorId == floorPlan.FloorId
                    || (block.AreaId.HasValue && areaIds.Contains(block.AreaId.Value))))
            .ToListAsync(cancellationToken);

        var reservationTables = await dbContext.RestaurantReservationTables
            .AsNoTracking()
            .ForTables(tableIds)
            .Include(reservationTable => reservationTable.Reservation)
            .Where(reservationTable =>
                ((reservationTable.Reservation!.Status == RestaurantReservationStatus.Pending
                    || reservationTable.Reservation.Status == RestaurantReservationStatus.Confirmed
                    || reservationTable.Reservation.Status == RestaurantReservationStatus.Seated)
                    && reservationTable.Reservation.StartAt <= request.At
                    && reservationTable.Reservation.EndAt > request.At)
                || (reservationTable.Reservation.Status == RestaurantReservationStatus.Completed
                    && reservationTable.Reservation.EndAt <= request.At
                    && reservationTable.Reservation.EndAt.AddMinutes(reservationTable.Reservation.TurnoverBufferMinutes) > request.At))
            .ToListAsync(cancellationToken);

        var statuses = layouts
            .Select(layout => ToStatusDetail(layout, blocks, reservationTables, request.At))
            .ToArray();

        return new RestaurantFloorPlanStatusMap(floorPlan.Id, request.At, statuses);
    }

    private IQueryable<RestaurantFloorPlan> GetFloorPlanAggregate(Guid floorPlanId)
    {
        return dbContext.RestaurantFloorPlans
            .Where(floorPlan => floorPlan.Id == floorPlanId)
            .Include(floorPlan => floorPlan.AreaLayouts)
            .ThenInclude(layout => layout.Area)
            .Include(floorPlan => floorPlan.TableLayouts)
            .ThenInclude(layout => layout.Table)
            .Include(floorPlan => floorPlan.TableLayouts)
            .ThenInclude(layout => layout.SeatLayouts);
    }

    private async Task<bool> LayoutReferencesMatchFloorPlanAsync(
        RestaurantFloorPlan floorPlan,
        SaveRestaurantFloorPlanRequest request,
        CancellationToken cancellationToken)
    {
        var areaIds = request.AreaLayouts.Select(static layout => layout.AreaId).Distinct().ToArray();
        var tableIds = request.TableLayouts.Select(static layout => layout.TableId).Distinct().ToArray();

        var matchingAreaCount = await dbContext.RestaurantAreas
            .AsNoTracking()
            .Where(area => areaIds.Contains(area.Id)
                && area.BranchId == floorPlan.BranchId
                && area.FloorId == floorPlan.FloorId)
            .CountAsync(cancellationToken);

        if (matchingAreaCount != areaIds.Length)
        {
            return false;
        }

        var matchingTableCount = await dbContext.RestaurantTables
            .AsNoTracking()
            .Where(table => tableIds.Contains(table.Id)
                && table.BranchId == floorPlan.BranchId
                && table.FloorId == floorPlan.FloorId)
            .CountAsync(cancellationToken);

        return matchingTableCount == tableIds.Length;
    }

    private async Task ReplaceLayoutsAsync(
        RestaurantFloorPlan floorPlan,
        SaveRestaurantFloorPlanRequest request,
        CancellationToken cancellationToken)
    {
        var existingTableLayouts = await dbContext.RestaurantTableLayouts
            .Where(layout => layout.FloorPlanId == floorPlan.Id)
            .ToListAsync(cancellationToken);
        var existingTableLayoutIds = existingTableLayouts.Select(static layout => layout.Id).ToArray();
        var existingSeatLayouts = await dbContext.RestaurantTableSeatLayouts
            .Where(layout => existingTableLayoutIds.Contains(layout.TableLayoutId))
            .ToListAsync(cancellationToken);
        var existingAreaLayouts = await dbContext.RestaurantAreaLayouts
            .Where(layout => layout.FloorPlanId == floorPlan.Id)
            .ToListAsync(cancellationToken);

        dbContext.RestaurantTableSeatLayouts.RemoveRange(existingSeatLayouts);
        dbContext.RestaurantTableLayouts.RemoveRange(existingTableLayouts);
        dbContext.RestaurantAreaLayouts.RemoveRange(existingAreaLayouts);

        var now = timeProvider.GetUtcNow();
        foreach (var areaLayoutRequest in request.AreaLayouts)
        {
            dbContext.RestaurantAreaLayouts.Add(new RestaurantAreaLayout
            {
                OrganizationId = dbContext.CurrentOrganizationId,
                FloorPlanId = floorPlan.Id,
                AreaId = areaLayoutRequest.AreaId,
                X = areaLayoutRequest.X,
                Y = areaLayoutRequest.Y,
                Width = areaLayoutRequest.Width,
                Height = areaLayoutRequest.Height,
                RotationDegrees = areaLayoutRequest.RotationDegrees,
                ZIndex = areaLayoutRequest.ZIndex,
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        foreach (var tableLayoutRequest in request.TableLayouts)
        {
            var tableLayout = new RestaurantTableLayout
            {
                OrganizationId = dbContext.CurrentOrganizationId,
                FloorPlanId = floorPlan.Id,
                TableId = tableLayoutRequest.TableId,
                CreatedAt = now
            };
            ApplyTableLayout(tableLayout, tableLayoutRequest, now);
            AddSeatLayouts(tableLayout, tableLayoutRequest.SeatLayouts, now);
            dbContext.RestaurantTableLayouts.Add(tableLayout);
        }
    }

    private static void ApplyTableLayout(
        RestaurantTableLayout tableLayout,
        SaveRestaurantTableLayoutRequest request,
        DateTimeOffset now)
    {
        tableLayout.X = request.X;
        tableLayout.Y = request.Y;
        tableLayout.Width = request.Width;
        tableLayout.Height = request.Height;
        tableLayout.RotationDegrees = request.RotationDegrees;
        tableLayout.Shape = request.Shape;
        tableLayout.ZIndex = request.ZIndex;
        tableLayout.UpdatedAt = now;
    }

    private void AddSeatLayouts(
        RestaurantTableLayout tableLayout,
        IReadOnlyCollection<SaveRestaurantTableSeatLayoutRequest> seatLayouts,
        DateTimeOffset now)
    {
        foreach (var seatLayout in seatLayouts.OrderBy(static seat => seat.SeatNumber))
        {
            dbContext.RestaurantTableSeatLayouts.Add(new RestaurantTableSeatLayout
            {
                OrganizationId = dbContext.CurrentOrganizationId,
                TableLayout = tableLayout,
                SeatNumber = seatLayout.SeatNumber,
                X = seatLayout.X,
                Y = seatLayout.Y,
                RotationDegrees = seatLayout.RotationDegrees,
                CreatedAt = now,
                UpdatedAt = now
            });
        }
    }

    private static RestaurantFloorPlanDetail ToDetail(RestaurantFloorPlan floorPlan)
    {
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
                .ThenBy(static layout => layout.Area!.Name)
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
                .ThenBy(static layout => layout.Table!.Label)
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

    private static RestaurantTableStatusDetail ToStatusDetail(
        RestaurantTableLayout layout,
        IReadOnlyCollection<RestaurantTableBlock> blocks,
        IReadOnlyCollection<RestaurantReservationTable> reservationTables,
        DateTimeOffset at)
    {
        var table = layout.Table!;
        if (!table.IsActive)
        {
            return new RestaurantTableStatusDetail(table.Id, table.Label, table.AreaId, RestaurantTableVisualStatus.Inactive, "Table is inactive.", null);
        }

        var block = blocks.FirstOrDefault(candidate =>
            candidate.TableId == table.Id
            || candidate.FloorId == table.FloorId
            || (candidate.AreaId.HasValue && table.AreaId == candidate.AreaId.Value));
        if (block is not null)
        {
            return new RestaurantTableStatusDetail(table.Id, table.Label, table.AreaId, RestaurantTableVisualStatus.Blocked, block.Reason, null);
        }

        var occupied = reservationTables.FirstOrDefault(candidate =>
            candidate.TableId == table.Id
            && candidate.Reservation!.Status == RestaurantReservationStatus.Seated
            && IsDuringReservation(candidate.Reservation, at));
        if (occupied is not null)
        {
            return new RestaurantTableStatusDetail(table.Id, table.Label, table.AreaId, RestaurantTableVisualStatus.Occupied, null, occupied.ReservationId);
        }

        var reserved = reservationTables.FirstOrDefault(candidate =>
            candidate.TableId == table.Id
            && ReservedStatuses.Contains(candidate.Reservation!.Status)
            && IsDuringReservation(candidate.Reservation, at));
        if (reserved is not null)
        {
            return new RestaurantTableStatusDetail(table.Id, table.Label, table.AreaId, RestaurantTableVisualStatus.Reserved, null, reserved.ReservationId);
        }

        var cleaning = reservationTables.FirstOrDefault(candidate =>
            candidate.TableId == table.Id
            && candidate.Reservation!.Status == RestaurantReservationStatus.Completed
            && IsCleaningWindow(candidate.Reservation, at));

        return cleaning is null
            ? new RestaurantTableStatusDetail(table.Id, table.Label, table.AreaId, RestaurantTableVisualStatus.Available, null, null)
            : new RestaurantTableStatusDetail(table.Id, table.Label, table.AreaId, RestaurantTableVisualStatus.Cleaning, null, cleaning.ReservationId);
    }

    private static bool IsDuringReservation(RestaurantReservation reservation, DateTimeOffset at)
    {
        return reservation.StartAt <= at && reservation.EndAt > at;
    }

    private static bool IsCleaningWindow(RestaurantReservation reservation, DateTimeOffset at)
    {
        return reservation.EndAt <= at && reservation.EndAt.AddMinutes(reservation.TurnoverBufferMinutes) > at;
    }

    private static bool IsValid(SaveRestaurantFloorPlanRequest request)
    {
        return !string.IsNullOrWhiteSpace(request.Name)
            && request.CanvasWidth > 0
            && request.CanvasHeight > 0
            && (request.GridSize is null or > 0)
            && request.AreaLayouts.All(IsValid)
            && request.TableLayouts.All(IsValid);
    }

    private static bool IsValid(SaveRestaurantAreaLayoutRequest request)
    {
        return request.Width > 0 && request.Height > 0;
    }

    private static bool IsValid(SaveRestaurantTableLayoutRequest request)
    {
        return request.Width > 0
            && request.Height > 0
            && request.SeatLayouts.Select(static seat => seat.SeatNumber).Distinct().Count() == request.SeatLayouts.Count;
    }
}
