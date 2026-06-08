using Microsoft.EntityFrameworkCore;
using Nexo.Server.Data;
using Nexo.Server.Modules.Restaurant.Data.Extensions;
using Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;
using Nexo.Server.Modules.Restaurant.Features.Availability;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Features.Reservations;

public sealed class RestaurantReservationService(
    NexoDbContext dbContext,
    RestaurantAvailabilityService availabilityService,
    TimeProvider timeProvider,
    RestaurantReservationConsistencyGuard consistencyGuard)
{
    private const int DefaultTurnoverBufferMinutes = 15;

    public async Task<RestaurantReservationOperationResult> CreateAsync(
        CreateRestaurantReservationRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.CustomerFullName) || request.PartySize <= 0)
        {
            return RestaurantReservationOperationResult.Failed(
                RestaurantReservationFailureCode.InvalidRequest,
                "Customer name and positive party size are required.");
        }

        using var consistencyScope = await consistencyGuard.EnterAsync(cancellationToken);
        var validation = await availabilityService.ValidateAssignedTablesAsync(
            new RestaurantTableAvailabilityValidationRequest(
                request.BranchId,
                request.TableIds,
                request.PartySize,
                request.StartAt,
                request.DurationMinutes),
            cancellationToken);

        if (!validation.IsAvailable)
        {
            return RestaurantReservationOperationResult.Failed(
                MapAvailabilityFailure(validation.Code),
                validation.Message);
        }

        var now = timeProvider.GetUtcNow();
        var customer = new RestaurantCustomer
        {
            CompanyId = dbContext.CurrentCompanyId,
            FullName = request.CustomerFullName.Trim(),
            Phone = string.IsNullOrWhiteSpace(request.CustomerPhone) ? null : request.CustomerPhone.Trim(),
            Email = string.IsNullOrWhiteSpace(request.CustomerEmail) ? null : request.CustomerEmail.Trim(),
            CreatedAt = now,
            UpdatedAt = now
        };
        var reservation = new RestaurantReservation
        {
            CompanyId = dbContext.CurrentCompanyId,
            BranchId = request.BranchId,
            Customer = customer,
            CustomerId = customer.Id,
            PartySize = request.PartySize,
            StartAt = validation.StartAt,
            EndAt = validation.EndAt,
            TurnoverBufferMinutes = DefaultTurnoverBufferMinutes,
            Status = RestaurantReservationStatus.Pending,
            Source = request.Source,
            SpecialRequests = string.IsNullOrWhiteSpace(request.SpecialRequests) ? null : request.SpecialRequests.Trim(),
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.RestaurantCustomers.Add(customer);
        dbContext.RestaurantReservations.Add(reservation);
        foreach (var tableId in validation.TableIds)
        {
            dbContext.RestaurantReservationTables.Add(new RestaurantReservationTable
            {
                CompanyId = dbContext.CurrentCompanyId,
                ReservationId = reservation.Id,
                TableId = tableId,
                CreatedAt = now
            });
        }

        dbContext.RestaurantReservationStatusHistory.Add(new RestaurantReservationStatusHistory
        {
            CompanyId = dbContext.CurrentCompanyId,
            ReservationId = reservation.Id,
            FromStatus = null,
            ToStatus = RestaurantReservationStatus.Pending,
            ChangedAt = now
        });

        await dbContext.SaveChangesAsync(cancellationToken);

        var detail = await GetDetailAsync(reservation.Id, cancellationToken);
        return RestaurantReservationOperationResult.Success(detail);
    }

    public async Task<IReadOnlyCollection<RestaurantReservationDetail>> ListDailyAsync(
        RestaurantReservationListRequest request,
        CancellationToken cancellationToken = default)
    {
        var query = dbContext.RestaurantReservations
            .AsNoTracking()
            .ForBranch(request.BranchId)
            .ForUtcDate(request.Date)
            .ForStatus(request.Status);

        var reservations = await query
            .OrderBy(reservation => reservation.StartAt)
            .Select(reservation => reservation.Id)
            .ToListAsync(cancellationToken);

        return await GetDetailsAsync(reservations, cancellationToken);
    }

    public async Task<IReadOnlyCollection<RestaurantReservationDetail>> ListTableDailyAsync(
        RestaurantTableReservationListRequest request,
        CancellationToken cancellationToken = default)
    {
        var reservationIds = await dbContext.RestaurantReservationTables
            .AsNoTracking()
            .ForTable(request.TableId)
            .Select(reservationTable => reservationTable.Reservation!)
            .ForUtcDate(request.Date)
            .OrderBy(reservation => reservation.StartAt)
            .Select(reservation => reservation.Id)
            .ToListAsync(cancellationToken);

        return await GetDetailsAsync(reservationIds, cancellationToken);
    }

    public async Task<RestaurantReservationDetail?> GetDetailAsync(
        Guid reservationId,
        CancellationToken cancellationToken = default)
    {
        var details = await GetDetailsAsync([reservationId], cancellationToken);
        return details.SingleOrDefault();
    }

    public async Task<RestaurantReservationOperationResult> UpdateStatusAsync(
        UpdateRestaurantReservationStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        var reservation = await dbContext.RestaurantReservations
            .SingleOrDefaultAsync(reservation => reservation.Id == request.ReservationId, cancellationToken);

        if (reservation is null)
        {
            return RestaurantReservationOperationResult.Failed(
                RestaurantReservationFailureCode.NotFound,
                "Reservation was not found.");
        }

        if (!CanTransition(reservation.Status, request.Status))
        {
            return RestaurantReservationOperationResult.Failed(
                RestaurantReservationFailureCode.InvalidStatusTransition,
                "Reservation status transition is not allowed.");
        }

        var now = timeProvider.GetUtcNow();
        var fromStatus = reservation.Status;
        reservation.Status = request.Status;
        reservation.UpdatedAt = now;
        if (request.Status == RestaurantReservationStatus.Cancelled)
        {
            reservation.CancelledAt = now;
            reservation.CancellationReason = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim();
        }

        dbContext.RestaurantReservationStatusHistory.Add(new RestaurantReservationStatusHistory
        {
            CompanyId = dbContext.CurrentCompanyId,
            ReservationId = reservation.Id,
            FromStatus = fromStatus,
            ToStatus = request.Status,
            Reason = string.IsNullOrWhiteSpace(request.Reason) ? null : request.Reason.Trim(),
            ChangedAt = now
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        return RestaurantReservationOperationResult.Success(await GetDetailAsync(reservation.Id, cancellationToken));
    }

    public Task<RestaurantReservationOperationResult> CancelAsync(
        CancelRestaurantReservationRequest request,
        CancellationToken cancellationToken = default)
    {
        return UpdateStatusAsync(
            new UpdateRestaurantReservationStatusRequest(
                request.ReservationId,
                RestaurantReservationStatus.Cancelled,
                request.Reason),
            cancellationToken);
    }

    private async Task<IReadOnlyCollection<RestaurantReservationDetail>> GetDetailsAsync(
        IReadOnlyCollection<Guid> reservationIds,
        CancellationToken cancellationToken)
    {
        var reservations = await dbContext.RestaurantReservations
            .ForReservationDetails(reservationIds)
            .ToListAsync(cancellationToken);

        return reservations
            .OrderBy(reservation => reservation.StartAt)
            .Select(ToDetail)
            .ToArray();
    }

    private static RestaurantReservationDetail ToDetail(RestaurantReservation reservation)
    {
        return new RestaurantReservationDetail(
            reservation.Id,
            reservation.BranchId,
            reservation.PartySize,
            reservation.StartAt,
            reservation.EndAt,
            reservation.TurnoverBufferMinutes,
            reservation.Status,
            reservation.Source,
            reservation.SpecialRequests,
            reservation.CancelledAt,
            reservation.CancellationReason,
            new RestaurantReservationCustomerDetail(
                reservation.Customer!.Id,
                reservation.Customer.FullName,
                reservation.Customer.Phone,
                reservation.Customer.Email),
            reservation.ReservationTables
                .OrderBy(static reservationTable => reservationTable.Table!.Label)
                .Select(static reservationTable => new RestaurantReservationTableDetail(
                    reservationTable.TableId,
                    reservationTable.Table!.Label))
                .ToArray(),
            reservation.StatusHistory
                .OrderBy(static history => history.ChangedAt)
                .Select(static history => new RestaurantReservationStatusHistoryDetail(
                    history.FromStatus,
                    history.ToStatus,
                    history.Reason,
                    history.ChangedAt))
                .ToArray());
    }

    private static RestaurantReservationFailureCode MapAvailabilityFailure(
        RestaurantAvailabilityFailureCode failureCode)
    {
        return failureCode switch
        {
            RestaurantAvailabilityFailureCode.BranchUnavailable => RestaurantReservationFailureCode.BranchUnavailable,
            RestaurantAvailabilityFailureCode.ClosedHours => RestaurantReservationFailureCode.ClosedHours,
            RestaurantAvailabilityFailureCode.SpecialDayClosed => RestaurantReservationFailureCode.SpecialDayClosed,
            RestaurantAvailabilityFailureCode.TableUnavailable => RestaurantReservationFailureCode.TableUnavailable,
            RestaurantAvailabilityFailureCode.InsufficientCapacity => RestaurantReservationFailureCode.InsufficientCapacity,
            RestaurantAvailabilityFailureCode.Blocked => RestaurantReservationFailureCode.Blocked,
            RestaurantAvailabilityFailureCode.Conflict => RestaurantReservationFailureCode.Conflict,
            _ => RestaurantReservationFailureCode.InvalidRequest
        };
    }

    private static bool CanTransition(
        RestaurantReservationStatus fromStatus,
        RestaurantReservationStatus toStatus)
    {
        if (fromStatus == toStatus)
        {
            return false;
        }

        return fromStatus switch
        {
            RestaurantReservationStatus.Pending => toStatus is RestaurantReservationStatus.Confirmed
                or RestaurantReservationStatus.Seated
                or RestaurantReservationStatus.Cancelled
                or RestaurantReservationStatus.NoShow,
            RestaurantReservationStatus.Confirmed => toStatus is RestaurantReservationStatus.Seated
                or RestaurantReservationStatus.Completed
                or RestaurantReservationStatus.Cancelled
                or RestaurantReservationStatus.NoShow,
            RestaurantReservationStatus.Seated => toStatus is RestaurantReservationStatus.Completed
                or RestaurantReservationStatus.Cancelled
                or RestaurantReservationStatus.NoShow,
            _ => false
        };
    }

}
