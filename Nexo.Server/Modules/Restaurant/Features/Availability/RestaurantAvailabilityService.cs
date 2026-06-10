using Microsoft.EntityFrameworkCore;
using Nexo.Server.Data;
using Nexo.Server.Modules.Restaurant.Data.Extensions;
using Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Availability;

public sealed class RestaurantAvailabilityService(NexoDbContext dbContext)
{
    private const int DefaultReservationMinutes = 90;

    public async Task<RestaurantAvailabilitySearchResult> SearchAsync(
        RestaurantAvailabilitySearchRequest request,
        CancellationToken cancellationToken = default)
    {
        var tables = await dbContext.RestaurantTables
            .AsNoTracking()
            .ForBranch(request.BranchId)
            .OrderBy(table => table.Label)
            .ToListAsync(cancellationToken);

        var availableTables = new List<RestaurantAvailabilityTableOption>();
        var rejections = new List<RestaurantAvailabilityRejection>();

        if (tables.Count == 0)
        {
            var validation = await ValidateAssignedTablesAsync(
                new RestaurantTableAvailabilityValidationRequest(
                    request.BranchId,
                    [],
                    request.PartySize,
                    request.StartAt,
                    request.DurationMinutes),
                cancellationToken);

            rejections.Add(new RestaurantAvailabilityRejection(null, validation.Code, validation.Message));
            return new RestaurantAvailabilitySearchResult(availableTables, rejections);
        }

        foreach (var table in tables)
        {
            var validation = await ValidateAssignedTablesAsync(
                new RestaurantTableAvailabilityValidationRequest(
                    request.BranchId,
                    [table.Id],
                    request.PartySize,
                    request.StartAt,
                    request.DurationMinutes),
                cancellationToken);

            if (validation.IsAvailable)
            {
                availableTables.Add(new RestaurantAvailabilityTableOption(
                    table.Id,
                    table.Label,
                    table.MinCapacity,
                    table.MaxCapacity,
                    validation.StartAt,
                    validation.EndAt));
                continue;
            }

            rejections.Add(new RestaurantAvailabilityRejection(table.Id, validation.Code, validation.Message));
        }

        return new RestaurantAvailabilitySearchResult(availableTables, rejections);
    }

    public async Task<RestaurantAvailabilityValidationResult> ValidateAssignedTablesAsync(
        RestaurantTableAvailabilityValidationRequest request,
        CancellationToken cancellationToken = default)
    {
        var branch = await dbContext.CoreBranches
            .AsNoTracking()
            .ForBranch(request.BranchId)
            .SingleOrDefaultAsync(cancellationToken);
        var durationMinutes = request.DurationMinutes is > 0
            ? request.DurationMinutes.Value
            : DefaultReservationMinutes;
        var endAt = request.StartAt.AddMinutes(durationMinutes);

        if (branch is null || !branch.IsActive)
        {
            return RestaurantAvailabilityValidationResult.Rejected(
                RestaurantAvailabilityFailureCode.BranchUnavailable,
                "Branch is not active or does not exist.",
                request.StartAt,
                endAt,
                request.TableIds.ToArray());
        }

        var tableIds = request.TableIds.Distinct().ToArray();
        if (tableIds.Length == 0)
        {
            return RestaurantAvailabilityValidationResult.Rejected(
                RestaurantAvailabilityFailureCode.TableUnavailable,
                "At least one table is required.",
                request.StartAt,
                endAt,
                tableIds);
        }

        var tables = await dbContext.RestaurantTables
            .AsNoTracking()
            .ForBranch(request.BranchId)
            .WithIds(tableIds)
            .ToListAsync(cancellationToken);

        if (tables.Count != tableIds.Length)
        {
            return RestaurantAvailabilityValidationResult.Rejected(
                RestaurantAvailabilityFailureCode.TableUnavailable,
                "One or more selected tables do not exist in the branch.",
                request.StartAt,
                endAt,
                tableIds);
        }

        durationMinutes = request.DurationMinutes is > 0
            ? request.DurationMinutes.Value
            : ResolveDurationMinutes(tables);
        endAt = request.StartAt.AddMinutes(durationMinutes);

        var floors = await dbContext.RestaurantFloors
            .AsNoTracking()
            .WithIds(tables.Select(static table => table.FloorId).ToArray())
            .ToDictionaryAsync(floor => floor.Id, cancellationToken);
        var areaIds = tables
            .Where(static table => table.AreaId.HasValue)
            .Select(static table => table.AreaId!.Value)
            .Distinct()
            .ToArray();
        var areas = await dbContext.RestaurantAreas
            .AsNoTracking()
            .WithIds(areaIds)
            .ToDictionaryAsync(area => area.Id, cancellationToken);

        if (tables.Any(static table => !table.IsActive)
            || tables.Any(table => !floors.TryGetValue(table.FloorId, out var floor) || !floor.IsActive)
            || tables.Any(table => table.AreaId.HasValue
                && (!areas.TryGetValue(table.AreaId.Value, out var area) || !area.IsActive)))
        {
            return RestaurantAvailabilityValidationResult.Rejected(
                RestaurantAvailabilityFailureCode.TableUnavailable,
                "Selected table, floor, or area is inactive.",
                request.StartAt,
                endAt,
                tableIds);
        }

        var minCapacity = tables.Min(static table => table.MinCapacity);
        var maxCapacity = tables.Sum(static table => table.MaxCapacity);
        if (request.PartySize < minCapacity || request.PartySize > maxCapacity)
        {
            return RestaurantAvailabilityValidationResult.Rejected(
                RestaurantAvailabilityFailureCode.InsufficientCapacity,
                "Party size does not fit the selected table capacity.",
                request.StartAt,
                endAt,
                tableIds);
        }

        var localWindow = TryGetLocalWindow(branch.TimeZone, request.StartAt, endAt);
        if (!await IsWithinOpeningWindowAsync(request.BranchId, localWindow, cancellationToken))
        {
            var specialDay = await dbContext.RestaurantSpecialDays
                .AsNoTracking()
                .SingleOrDefaultAsync(day => day.BranchId == request.BranchId && day.Date == localWindow.Start.Date, cancellationToken);
            var code = specialDay?.IsClosed == true
                ? RestaurantAvailabilityFailureCode.SpecialDayClosed
                : RestaurantAvailabilityFailureCode.ClosedHours;

            return RestaurantAvailabilityValidationResult.Rejected(
                code,
                code == RestaurantAvailabilityFailureCode.SpecialDayClosed
                    ? "Branch is closed for a special day."
                    : "Requested time is outside opening hours.",
                request.StartAt,
                endAt,
                tableIds);
        }

        if (await HasBlockingTableBlockAsync(tables, request.StartAt, endAt, cancellationToken))
        {
            return RestaurantAvailabilityValidationResult.Rejected(
                RestaurantAvailabilityFailureCode.Blocked,
                "Selected table is blocked.",
                request.StartAt,
                endAt,
                tableIds);
        }

        if (await HasReservationConflictAsync(tableIds, request.StartAt, endAt, cancellationToken))
        {
            return RestaurantAvailabilityValidationResult.Rejected(
                RestaurantAvailabilityFailureCode.Conflict,
                "Selected table has an overlapping reservation.",
                request.StartAt,
                endAt,
                tableIds);
        }

        return RestaurantAvailabilityValidationResult.Available(request.StartAt, endAt, tableIds);
    }

    private static int ResolveDurationMinutes(IReadOnlyCollection<RestaurantTable> tables)
    {
        return tables.Count == 1 && tables.First().DefaultReservationMinutes is > 0
            ? tables.First().DefaultReservationMinutes!.Value
            : DefaultReservationMinutes;
    }

    private async Task<bool> IsWithinOpeningWindowAsync(
        Guid branchId,
        RestaurantLocalWindow localWindow,
        CancellationToken cancellationToken)
    {
        if (localWindow.Start.Date != localWindow.End.Date)
        {
            return false;
        }

        var specialDay = await dbContext.RestaurantSpecialDays
            .AsNoTracking()
            .ForBranch(branchId)
            .ForDate(localWindow.Start.Date)
            .SingleOrDefaultAsync(cancellationToken);
        if (specialDay is { IsClosed: true })
        {
            return false;
        }

        if (specialDay is { OpensAt: not null, ClosesAt: not null })
        {
            return localWindow.Start.Time >= specialDay.OpensAt.Value
                && localWindow.End.Time <= specialDay.ClosesAt.Value;
        }

        var openingHour = await dbContext.RestaurantOpeningHours
            .AsNoTracking()
            .ForBranch(branchId)
            .ForDayOfWeek(localWindow.Start.DayOfWeek)
            .SingleOrDefaultAsync(cancellationToken);

        return openingHour is { IsClosed: false }
            && localWindow.Start.Time >= openingHour.OpensAt
            && localWindow.End.Time <= openingHour.ClosesAt;
    }

    private async Task<bool> HasBlockingTableBlockAsync(
        IReadOnlyCollection<RestaurantTable> tables,
        DateTimeOffset startAt,
        DateTimeOffset endAt,
        CancellationToken cancellationToken)
    {
        var tableIds = tables.Select(static table => table.Id).ToArray();
        var floorIds = tables.Select(static table => table.FloorId).Distinct().ToArray();
        var areaIds = tables
            .Where(static table => table.AreaId.HasValue)
            .Select(static table => table.AreaId!.Value)
            .Distinct()
            .ToArray();

        return await dbContext.RestaurantTableBlocks
            .AsNoTracking()
            .ActiveOnly()
            .Overlapping(startAt, endAt)
            .ForAnyTableScope(tableIds, floorIds, areaIds)
            .AnyAsync(cancellationToken);
    }

    private async Task<bool> HasReservationConflictAsync(
        IReadOnlyCollection<Guid> tableIds,
        DateTimeOffset startAt,
        DateTimeOffset endAt,
        CancellationToken cancellationToken)
    {
        return await dbContext.RestaurantReservationTables
            .BlockingReservationOverlaps(tableIds, startAt, endAt)
            .AnyAsync(cancellationToken);
    }

    private static RestaurantLocalWindow TryGetLocalWindow(
        string timeZoneId,
        DateTimeOffset startAt,
        DateTimeOffset endAt)
    {
        TimeZoneInfo timeZone;
        try
        {
            timeZone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch (TimeZoneNotFoundException)
        {
            timeZone = TimeZoneInfo.Utc;
        }
        catch (InvalidTimeZoneException)
        {
            timeZone = TimeZoneInfo.Utc;
        }

        return new RestaurantLocalWindow(
            DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(startAt, timeZone).DateTime),
            TimeOnly.FromDateTime(TimeZoneInfo.ConvertTime(startAt, timeZone).DateTime),
            DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(endAt, timeZone).DateTime),
            TimeOnly.FromDateTime(TimeZoneInfo.ConvertTime(endAt, timeZone).DateTime));
    }

    private sealed record RestaurantLocalWindow(
        DateOnly StartDate,
        TimeOnly StartTime,
        DateOnly EndDate,
        TimeOnly EndTime)
    {
        public RestaurantLocalPoint Start { get; } = new(StartDate, StartTime);
        public RestaurantLocalPoint End { get; } = new(EndDate, EndTime);
    }

    private sealed record RestaurantLocalPoint(DateOnly Date, TimeOnly Time)
    {
        public DayOfWeek DayOfWeek => Date.DayOfWeek;
    }
}
