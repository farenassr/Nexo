using Microsoft.EntityFrameworkCore;
using Nexo.Server.Data;
using Nexo.Server.Modules.Restaurant.Data.Extensions;
using Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Dashboard;

public sealed class RestaurantDashboardService(NexoDbContext dbContext, TimeProvider timeProvider)
{
    private static readonly RestaurantReservationStatus[] UpcomingStatuses =
    [
        RestaurantReservationStatus.Pending,
        RestaurantReservationStatus.Confirmed
    ];

    private static readonly RestaurantReservationStatus[] OccupancyStatuses =
    [
        RestaurantReservationStatus.Pending,
        RestaurantReservationStatus.Confirmed,
        RestaurantReservationStatus.Seated,
        RestaurantReservationStatus.Completed
    ];

    public async Task<RestaurantDashboardSummary> GetAsync(
        RestaurantDashboardRequest request,
        CancellationToken cancellationToken = default)
    {
        var activeTables = await dbContext.RestaurantTables
            .AsNoTracking()
            .ForBranch(request.BranchId)
            .ActiveOnly()
            .Select(table => new TableCapacity(table.Id, table.MaxCapacity))
            .ToArrayAsync(cancellationToken);

        var reservations = await dbContext.RestaurantReservations
            .AsNoTracking()
            .ForBranch(request.BranchId)
            .ForUtcDate(request.Date)
            .Include(reservation => reservation.Customer)
            .Include(reservation => reservation.ReservationTables)
            .ThenInclude(reservationTable => reservationTable.Table)
            .OrderBy(reservation => reservation.StartAt)
            .ToArrayAsync(cancellationToken);

        var now = timeProvider.GetUtcNow();
        var dayStart = new DateTimeOffset(request.Date.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var dayEnd = dayStart.AddDays(1);
        var selectedInstant = DateOnly.FromDateTime(now.UtcDateTime) == request.Date
            ? now
            : dayStart;

        var activeTableIds = activeTables.Select(static table => table.Id).ToHashSet();
        var unavailableTableIds = await GetUnavailableTableIdsAsync(
            request.BranchId,
            activeTableIds,
            reservations,
            selectedInstant,
            cancellationToken);

        var upcomingReservations = reservations
            .Where(reservation => UpcomingStatuses.Contains(reservation.Status)
                && reservation.StartAt >= selectedInstant
                && reservation.StartAt < dayEnd)
            .OrderBy(reservation => reservation.StartAt)
            .Take(6)
            .Select(ToUpcomingReservation)
            .ToArray();

        var metrics = new[]
        {
            new RestaurantDashboardMetric("todayReservations", "Today's Reservations", reservations.Length),
            new RestaurantDashboardMetric("occupiedTables", "Occupied Tables", CountOccupiedTables(reservations, selectedInstant, activeTableIds)),
            new RestaurantDashboardMetric("freeTables", "Free Tables", Math.Max(0, activeTables.Length - unavailableTableIds.Count)),
            new RestaurantDashboardMetric("upcomingReservations", "Upcoming Reservations", upcomingReservations.Length),
            new RestaurantDashboardMetric("cancellations", "Cancellations", reservations.Count(static reservation => reservation.Status == RestaurantReservationStatus.Cancelled)),
            new RestaurantDashboardMetric("noShows", "No-shows", reservations.Count(static reservation => reservation.Status == RestaurantReservationStatus.NoShow))
        };

        return new RestaurantDashboardSummary(
            request.BranchId,
            request.Date,
            metrics,
            BuildOccupancyByHour(reservations, dayStart, activeTables.Sum(static table => table.MaxCapacity)),
            upcomingReservations);
    }

    private async Task<HashSet<Guid>> GetUnavailableTableIdsAsync(
        Guid branchId,
        HashSet<Guid> activeTableIds,
        IReadOnlyCollection<RestaurantReservation> reservations,
        DateTimeOffset selectedInstant,
        CancellationToken cancellationToken)
    {
        var unavailableTableIds = reservations
            .Where(reservation => IsTableUnavailable(reservation, selectedInstant))
            .SelectMany(static reservation => reservation.ReservationTables)
            .Select(static reservationTable => reservationTable.TableId)
            .Where(activeTableIds.Contains)
            .ToHashSet();

        var activeBlocks = await dbContext.RestaurantTableBlocks
            .AsNoTracking()
            .ActiveOnly()
            .Where(block => block.BranchId == branchId
                && block.StartAt <= selectedInstant
                && block.EndAt > selectedInstant
                && block.TableId.HasValue
                && activeTableIds.Contains(block.TableId.Value))
            .Select(block => block.TableId!.Value)
            .ToArrayAsync(cancellationToken);

        unavailableTableIds.UnionWith(activeBlocks);
        return unavailableTableIds;
    }

    private static int CountOccupiedTables(
        IReadOnlyCollection<RestaurantReservation> reservations,
        DateTimeOffset selectedInstant,
        HashSet<Guid> activeTableIds)
    {
        return reservations
            .Where(reservation => reservation.Status == RestaurantReservationStatus.Seated
                && reservation.StartAt <= selectedInstant
                && reservation.EndAt > selectedInstant)
            .SelectMany(static reservation => reservation.ReservationTables)
            .Select(static reservationTable => reservationTable.TableId)
            .Where(activeTableIds.Contains)
            .Distinct()
            .Count();
    }

    private static bool IsTableUnavailable(RestaurantReservation reservation, DateTimeOffset selectedInstant)
    {
        return reservation.Status switch
        {
            RestaurantReservationStatus.Pending or RestaurantReservationStatus.Confirmed or RestaurantReservationStatus.Seated =>
                reservation.StartAt <= selectedInstant && reservation.EndAt > selectedInstant,
            RestaurantReservationStatus.Completed =>
                reservation.EndAt <= selectedInstant
                && reservation.EndAt.AddMinutes(reservation.TurnoverBufferMinutes) > selectedInstant,
            _ => false
        };
    }

    private static IReadOnlyCollection<RestaurantOccupancyByHourPoint> BuildOccupancyByHour(
        IReadOnlyCollection<RestaurantReservation> reservations,
        DateTimeOffset dayStart,
        int totalCapacity)
    {
        return Enumerable.Range(0, 24)
            .Select(hour =>
            {
                var hourStart = dayStart.AddHours(hour);
                var hourEnd = hourStart.AddHours(1);
                var overlappingReservations = reservations
                    .Where(reservation => OccupancyStatuses.Contains(reservation.Status)
                        && reservation.StartAt < hourEnd
                        && reservation.EndAt > hourStart)
                    .ToArray();
                var occupiedCovers = overlappingReservations.Sum(static reservation => reservation.PartySize);
                var occupancyPercent = totalCapacity <= 0
                    ? 0
                    : Math.Min(100, (int)Math.Round(occupiedCovers * 100d / totalCapacity, MidpointRounding.AwayFromZero));

                return new RestaurantOccupancyByHourPoint(hour, overlappingReservations.Length, occupiedCovers, occupancyPercent);
            })
            .ToArray();
    }

    private static RestaurantUpcomingReservationSummary ToUpcomingReservation(RestaurantReservation reservation)
    {
        return new RestaurantUpcomingReservationSummary(
            reservation.Id,
            reservation.StartAt,
            reservation.EndAt,
            reservation.Customer?.FullName ?? string.Empty,
            reservation.PartySize,
            reservation.Status,
            reservation.ReservationTables
                .Select(static reservationTable => reservationTable.Table?.Label ?? string.Empty)
                .Where(static label => label.Length > 0)
                .Order()
                .ToArray());
    }

    private sealed record TableCapacity(Guid Id, int MaxCapacity);
}
