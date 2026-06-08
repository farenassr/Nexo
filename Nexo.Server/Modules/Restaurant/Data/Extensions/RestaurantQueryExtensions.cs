using Microsoft.EntityFrameworkCore;
using Nexo.Server.Modules.Core.Data.Entities;
using Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Data.Extensions;

public static class RestaurantBranchQueryExtensions
{
    public static IQueryable<CoreBranch> ForBranch(this IQueryable<CoreBranch> query, Guid branchId)
    {
        return query.Where(branch => branch.Id == branchId);
    }

    public static IQueryable<CoreBranch> ActiveOnly(this IQueryable<CoreBranch> query)
    {
        return query.Where(branch => branch.IsActive);
    }
}

public static class RestaurantTableQueryExtensions
{
    public static IQueryable<RestaurantTable> ForBranch(this IQueryable<RestaurantTable> query, Guid branchId)
    {
        return query.Where(table => table.BranchId == branchId);
    }

    public static IQueryable<RestaurantTable> WithIds(this IQueryable<RestaurantTable> query, IReadOnlyCollection<Guid> tableIds)
    {
        return query.Where(table => tableIds.Contains(table.Id));
    }

    public static IQueryable<RestaurantTable> ActiveOnly(this IQueryable<RestaurantTable> query)
    {
        return query.Where(table => table.IsActive);
    }
}

public static class RestaurantFloorQueryExtensions
{
    public static IQueryable<RestaurantFloor> WithIds(this IQueryable<RestaurantFloor> query, IReadOnlyCollection<Guid> floorIds)
    {
        return query.Where(floor => floorIds.Contains(floor.Id));
    }

    public static IQueryable<RestaurantFloor> ActiveOnly(this IQueryable<RestaurantFloor> query)
    {
        return query.Where(floor => floor.IsActive);
    }
}

public static class RestaurantAreaQueryExtensions
{
    public static IQueryable<RestaurantArea> WithIds(this IQueryable<RestaurantArea> query, IReadOnlyCollection<Guid> areaIds)
    {
        return query.Where(area => areaIds.Contains(area.Id));
    }

    public static IQueryable<RestaurantArea> ActiveOnly(this IQueryable<RestaurantArea> query)
    {
        return query.Where(area => area.IsActive);
    }
}

public static class RestaurantOpeningHourQueryExtensions
{
    public static IQueryable<RestaurantOpeningHour> ForBranch(this IQueryable<RestaurantOpeningHour> query, Guid branchId)
    {
        return query.Where(openingHour => openingHour.BranchId == branchId);
    }

    public static IQueryable<RestaurantOpeningHour> ForDayOfWeek(this IQueryable<RestaurantOpeningHour> query, DayOfWeek dayOfWeek)
    {
        return query.Where(openingHour => openingHour.DayOfWeek == dayOfWeek);
    }
}

public static class RestaurantSpecialDayQueryExtensions
{
    public static IQueryable<RestaurantSpecialDay> ForBranch(this IQueryable<RestaurantSpecialDay> query, Guid branchId)
    {
        return query.Where(specialDay => specialDay.BranchId == branchId);
    }

    public static IQueryable<RestaurantSpecialDay> ForDate(this IQueryable<RestaurantSpecialDay> query, DateOnly date)
    {
        return query.Where(specialDay => specialDay.Date == date);
    }
}

public static class RestaurantTableBlockQueryExtensions
{
    public static IQueryable<RestaurantTableBlock> ActiveOnly(this IQueryable<RestaurantTableBlock> query)
    {
        return query.Where(block => block.IsActive);
    }

    public static IQueryable<RestaurantTableBlock> Overlapping(
        this IQueryable<RestaurantTableBlock> query,
        DateTimeOffset startAt,
        DateTimeOffset endAt)
    {
        return query.Where(block => block.StartAt < endAt && block.EndAt > startAt);
    }

    public static IQueryable<RestaurantTableBlock> ForAnyTableScope(
        this IQueryable<RestaurantTableBlock> query,
        IReadOnlyCollection<Guid> tableIds,
        IReadOnlyCollection<Guid> floorIds,
        IReadOnlyCollection<Guid> areaIds)
    {
        return query.Where(block =>
            (block.TableId.HasValue && tableIds.Contains(block.TableId.Value))
            || (block.AreaId.HasValue && areaIds.Contains(block.AreaId.Value))
            || (block.FloorId.HasValue && floorIds.Contains(block.FloorId.Value)));
    }
}

public static class RestaurantReservationTableQueryExtensions
{
    private static readonly RestaurantReservationStatus[] BlockingStatuses =
    [
        RestaurantReservationStatus.Pending,
        RestaurantReservationStatus.Confirmed,
        RestaurantReservationStatus.Seated
    ];

    public static IQueryable<RestaurantReservationTable> ForTable(
        this IQueryable<RestaurantReservationTable> query,
        Guid tableId)
    {
        return query.Where(reservationTable => reservationTable.TableId == tableId);
    }

    public static IQueryable<RestaurantReservationTable> ForTables(
        this IQueryable<RestaurantReservationTable> query,
        IReadOnlyCollection<Guid> tableIds)
    {
        return query.Where(reservationTable => tableIds.Contains(reservationTable.TableId));
    }

    public static IQueryable<RestaurantReservation> BlockingReservationOverlaps(
        this IQueryable<RestaurantReservationTable> query,
        IReadOnlyCollection<Guid> tableIds,
        DateTimeOffset startAt,
        DateTimeOffset endAt)
    {
        return query
            .AsNoTracking()
            .ForTables(tableIds)
            .Select(reservationTable => reservationTable.Reservation!)
            .Where(reservation => BlockingStatuses.Contains(reservation.Status)
                && reservation.StartAt < endAt
                && reservation.EndAt.AddMinutes(reservation.TurnoverBufferMinutes) > startAt);
    }
}

public static class RestaurantReservationQueryExtensions
{
    public static IQueryable<RestaurantReservation> ForReservationDetails(
        this IQueryable<RestaurantReservation> query,
        IReadOnlyCollection<Guid> reservationIds)
    {
        return query
            .AsNoTracking()
            .Where(reservation => reservationIds.Contains(reservation.Id))
            .Include(reservation => reservation.Customer)
            .Include(reservation => reservation.ReservationTables)
            .ThenInclude(reservationTable => reservationTable.Table)
            .Include(reservation => reservation.StatusHistory);
    }

    public static IQueryable<RestaurantReservation> ForBranch(
        this IQueryable<RestaurantReservation> query,
        Guid branchId)
    {
        return query.Where(reservation => reservation.BranchId == branchId);
    }

    public static IQueryable<RestaurantReservation> ForUtcDate(
        this IQueryable<RestaurantReservation> query,
        DateOnly date)
    {
        var startAt = new DateTimeOffset(date.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var endAt = startAt.AddDays(1);

        return query.Where(reservation => reservation.StartAt >= startAt && reservation.StartAt < endAt);
    }

    public static IQueryable<RestaurantReservation> ForStatus(
        this IQueryable<RestaurantReservation> query,
        RestaurantReservationStatus? status)
    {
        return status.HasValue
            ? query.Where(reservation => reservation.Status == status.Value)
            : query;
    }
}
