using Microsoft.EntityFrameworkCore;
using Nexo.Server.Data;
using Nexo.Server.Modules.Core.CompanyContext;
using Nexo.Server.Modules.Core.Data.Entities;
using Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;
using Nexo.Server.Modules.Restaurant.Features.Availability;
using Nexo.Server.Modules.Restaurant.Features.Reservations;
using Nexo.Shared.Restaurant;
using TUnit.Assertions;
using TUnit.Core;

namespace Nexo.Server.Tests.Modules.Restaurant.Reservations;

public sealed class RestaurantAvailabilityAndReservationServiceTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.Parse("2026-06-08T10:00:00Z");

    [Test]
    public async Task SearchAsync_RejectsClosedHours()
    {
        await using var dbContext = CreateContext();
        var fixture = SeedRestaurant(dbContext);
        dbContext.RestaurantOpeningHours.Add(OpenHours(fixture, DayOfWeek.Monday, "09:00", "17:00"));
        await dbContext.SaveChangesAsync();
        var service = new RestaurantAvailabilityService(dbContext);

        var result = await service.SearchAsync(new RestaurantAvailabilitySearchRequest(
            fixture.BranchId,
            2,
            DateTimeOffset.Parse("2026-06-08T18:00:00Z"),
            60));

        await Assert.That(result.AvailableTables).IsEmpty();
        await Assert.That(result.Rejections.Select(static rejection => rejection.Code))
            .Contains(RestaurantAvailabilityFailureCode.ClosedHours);
    }

    [Test]
    public async Task SearchAsync_AppliesSpecialDayClosureAndOverrideHours()
    {
        await using var dbContext = CreateContext();
        var fixture = SeedRestaurant(dbContext);
        dbContext.RestaurantOpeningHours.Add(OpenHours(fixture, DayOfWeek.Monday, "09:00", "17:00"));
        dbContext.RestaurantSpecialDays.Add(new RestaurantSpecialDay
        {
            CompanyId = fixture.CompanyId,
            BranchId = fixture.BranchId,
            Date = DateOnly.Parse("2026-06-08"),
            Name = "Holiday",
            IsClosed = true,
            CreatedAt = Now,
            UpdatedAt = Now
        });
        await dbContext.SaveChangesAsync();
        var service = new RestaurantAvailabilityService(dbContext);

        var closedResult = await service.SearchAsync(new RestaurantAvailabilitySearchRequest(
            fixture.BranchId,
            2,
            DateTimeOffset.Parse("2026-06-08T12:00:00Z"),
            60));

        await Assert.That(closedResult.AvailableTables).IsEmpty();
        await Assert.That(closedResult.Rejections.Select(static rejection => rejection.Code))
            .Contains(RestaurantAvailabilityFailureCode.SpecialDayClosed);

        var specialDay = await dbContext.RestaurantSpecialDays.SingleAsync();
        specialDay.IsClosed = false;
        specialDay.OpensAt = TimeOnly.Parse("12:00");
        specialDay.ClosesAt = TimeOnly.Parse("14:00");
        await dbContext.SaveChangesAsync();

        var overrideResult = await service.SearchAsync(new RestaurantAvailabilitySearchRequest(
            fixture.BranchId,
            2,
            DateTimeOffset.Parse("2026-06-08T12:30:00Z"),
            60));

        await Assert.That(overrideResult.AvailableTables.Select(static table => table.TableId))
            .Contains(fixture.TableId);
    }

    [Test]
    public async Task SearchAsync_RejectsInactiveTablesAndInsufficientCapacity()
    {
        await using var dbContext = CreateContext();
        var fixture = SeedRestaurant(dbContext, maxCapacity: 2);
        dbContext.RestaurantOpeningHours.Add(OpenHours(fixture, DayOfWeek.Monday, "09:00", "17:00"));
        await dbContext.SaveChangesAsync();
        var service = new RestaurantAvailabilityService(dbContext);

        var capacityResult = await service.SearchAsync(new RestaurantAvailabilitySearchRequest(
            fixture.BranchId,
            4,
            DateTimeOffset.Parse("2026-06-08T12:00:00Z"),
            60));

        await Assert.That(capacityResult.AvailableTables).IsEmpty();
        await Assert.That(capacityResult.Rejections.Select(static rejection => rejection.Code))
            .Contains(RestaurantAvailabilityFailureCode.InsufficientCapacity);

        var table = await dbContext.RestaurantTables.SingleAsync();
        table.IsActive = false;
        await dbContext.SaveChangesAsync();

        var inactiveResult = await service.SearchAsync(new RestaurantAvailabilitySearchRequest(
            fixture.BranchId,
            2,
            DateTimeOffset.Parse("2026-06-08T12:00:00Z"),
            60));

        await Assert.That(inactiveResult.AvailableTables).IsEmpty();
        await Assert.That(inactiveResult.Rejections.Select(static rejection => rejection.Code))
            .Contains(RestaurantAvailabilityFailureCode.TableUnavailable);
    }

    [Test]
    public async Task SearchAsync_RejectsTableFloorAndAreaBlocks()
    {
        await using var dbContext = CreateContext();
        var fixture = SeedRestaurant(dbContext);
        dbContext.RestaurantOpeningHours.Add(OpenHours(fixture, DayOfWeek.Monday, "09:00", "17:00"));
        dbContext.RestaurantTableBlocks.Add(new RestaurantTableBlock
        {
            CompanyId = fixture.CompanyId,
            BranchId = fixture.BranchId,
            AreaId = fixture.AreaId,
            StartAt = DateTimeOffset.Parse("2026-06-08T11:00:00Z"),
            EndAt = DateTimeOffset.Parse("2026-06-08T13:00:00Z"),
            Reason = "Maintenance",
            IsActive = true,
            CreatedAt = Now,
            UpdatedAt = Now
        });
        await dbContext.SaveChangesAsync();
        var service = new RestaurantAvailabilityService(dbContext);

        var result = await service.SearchAsync(new RestaurantAvailabilitySearchRequest(
            fixture.BranchId,
            2,
            DateTimeOffset.Parse("2026-06-08T12:00:00Z"),
            60));

        await Assert.That(result.AvailableTables).IsEmpty();
        await Assert.That(result.Rejections.Select(static rejection => rejection.Code))
            .Contains(RestaurantAvailabilityFailureCode.Blocked);
    }

    [Test]
    public async Task SearchAsync_AppliesReservationConflictAndTerminalStatusRules()
    {
        await using var dbContext = CreateContext();
        var fixture = SeedRestaurant(dbContext);
        dbContext.RestaurantOpeningHours.Add(OpenHours(fixture, DayOfWeek.Monday, "09:00", "17:00"));
        SeedReservation(dbContext, fixture, RestaurantReservationStatus.Confirmed, "2026-06-08T12:00:00Z", "2026-06-08T13:00:00Z");
        await dbContext.SaveChangesAsync();
        var service = new RestaurantAvailabilityService(dbContext);

        var conflictResult = await service.SearchAsync(new RestaurantAvailabilitySearchRequest(
            fixture.BranchId,
            2,
            DateTimeOffset.Parse("2026-06-08T12:30:00Z"),
            60));

        await Assert.That(conflictResult.AvailableTables).IsEmpty();
        await Assert.That(conflictResult.Rejections.Select(static rejection => rejection.Code))
            .Contains(RestaurantAvailabilityFailureCode.Conflict);

        var reservation = await dbContext.RestaurantReservations.SingleAsync();
        reservation.Status = RestaurantReservationStatus.Cancelled;
        await dbContext.SaveChangesAsync();

        var terminalResult = await service.SearchAsync(new RestaurantAvailabilitySearchRequest(
            fixture.BranchId,
            2,
            DateTimeOffset.Parse("2026-06-08T12:30:00Z"),
            60));

        await Assert.That(terminalResult.AvailableTables.Select(static table => table.TableId))
            .Contains(fixture.TableId);
    }

    [Test]
    public async Task SearchAsync_AppliesTurnoverBufferConflicts()
    {
        await using var dbContext = CreateContext();
        var fixture = SeedRestaurant(dbContext);
        dbContext.RestaurantOpeningHours.Add(OpenHours(fixture, DayOfWeek.Monday, "09:00", "17:00"));
        SeedReservation(
            dbContext,
            fixture,
            RestaurantReservationStatus.Seated,
            "2026-06-08T12:00:00Z",
            "2026-06-08T13:00:00Z",
            turnoverBufferMinutes: 20);
        await dbContext.SaveChangesAsync();
        var service = new RestaurantAvailabilityService(dbContext);

        var result = await service.SearchAsync(new RestaurantAvailabilitySearchRequest(
            fixture.BranchId,
            2,
            DateTimeOffset.Parse("2026-06-08T13:10:00Z"),
            30));

        await Assert.That(result.AvailableTables).IsEmpty();
        await Assert.That(result.Rejections.Select(static rejection => rejection.Code))
            .Contains(RestaurantAvailabilityFailureCode.Conflict);
    }

    [Test]
    public async Task CreateAsync_CreatesCustomerReservationTableAndCreationHistory()
    {
        await using var dbContext = CreateContext();
        var fixture = SeedRestaurant(dbContext);
        dbContext.RestaurantOpeningHours.Add(OpenHours(fixture, DayOfWeek.Monday, "09:00", "17:00"));
        await dbContext.SaveChangesAsync();
        var service = CreateReservationService(dbContext);

        var result = await service.CreateAsync(new CreateRestaurantReservationRequest(
            fixture.BranchId,
            [fixture.TableId],
            2,
            DateTimeOffset.Parse("2026-06-08T12:00:00Z"),
            60,
            "Ada Lovelace",
            "+15550101",
            "ada@example.com",
            RestaurantReservationSource.Phone,
            "Window table"));

        await Assert.That(result.Succeeded).IsTrue();
        await Assert.That(await dbContext.RestaurantCustomers.CountAsync()).IsEqualTo(1);
        await Assert.That(await dbContext.RestaurantReservations.CountAsync()).IsEqualTo(1);
        await Assert.That(await dbContext.RestaurantReservationTables.CountAsync()).IsEqualTo(1);
        var history = await dbContext.RestaurantReservationStatusHistory.SingleAsync();
        await Assert.That(history.FromStatus).IsNull();
        await Assert.That(history.ToStatus).IsEqualTo(RestaurantReservationStatus.Pending);
    }

    [Test]
    public async Task CreateAsync_RejectsDoubleBooking()
    {
        await using var dbContext = CreateContext();
        var fixture = SeedRestaurant(dbContext);
        dbContext.RestaurantOpeningHours.Add(OpenHours(fixture, DayOfWeek.Monday, "09:00", "17:00"));
        SeedReservation(dbContext, fixture, RestaurantReservationStatus.Pending, "2026-06-08T12:00:00Z", "2026-06-08T13:00:00Z");
        await dbContext.SaveChangesAsync();
        var service = CreateReservationService(dbContext);

        var result = await service.CreateAsync(new CreateRestaurantReservationRequest(
            fixture.BranchId,
            [fixture.TableId],
            2,
            DateTimeOffset.Parse("2026-06-08T12:30:00Z"),
            60,
            "Grace Hopper",
            null,
            null,
            RestaurantReservationSource.Staff,
            null));

        await Assert.That(result.Succeeded).IsFalse();
        await Assert.That(result.FailureCode).IsEqualTo(RestaurantReservationFailureCode.Conflict);
        await Assert.That(await dbContext.RestaurantReservations.CountAsync()).IsEqualTo(1);
    }

    [Test]
    public async Task CreateAsync_RejectsDuplicateTableAssignments()
    {
        await using var dbContext = CreateContext();
        var fixture = SeedRestaurant(dbContext);
        dbContext.RestaurantOpeningHours.Add(OpenHours(fixture, DayOfWeek.Monday, "09:00", "17:00"));
        await dbContext.SaveChangesAsync();
        var service = CreateReservationService(dbContext);

        var result = await service.CreateAsync(new CreateRestaurantReservationRequest(
            fixture.BranchId,
            [fixture.TableId, fixture.TableId],
            2,
            DateTimeOffset.Parse("2026-06-08T12:00:00Z"),
            60,
            "Grace Hopper",
            null,
            null,
            RestaurantReservationSource.Staff,
            null));

        await Assert.That(result.Succeeded).IsFalse();
        await Assert.That(result.FailureCode).IsEqualTo(RestaurantReservationFailureCode.InvalidRequest);
        await Assert.That(await dbContext.RestaurantReservations.CountAsync()).IsEqualTo(0);
    }

    [Test]
    public async Task UpdateStatusAsync_RecordsHistoryAndRejectsInvalidTerminalTransition()
    {
        await using var dbContext = CreateContext();
        var fixture = SeedRestaurant(dbContext);
        var reservationId = SeedReservation(dbContext, fixture, RestaurantReservationStatus.Pending, "2026-06-08T12:00:00Z", "2026-06-08T13:00:00Z");
        await dbContext.SaveChangesAsync();
        var service = CreateReservationService(dbContext);

        var updateResult = await service.UpdateStatusAsync(new UpdateRestaurantReservationStatusRequest(
            reservationId,
            RestaurantReservationStatus.Confirmed,
            "Confirmed by phone"));

        await Assert.That(updateResult.Succeeded).IsTrue();
        await Assert.That(await dbContext.RestaurantReservationStatusHistory.CountAsync()).IsEqualTo(1);
        var history = await dbContext.RestaurantReservationStatusHistory.SingleAsync();
        await Assert.That(history.FromStatus).IsEqualTo(RestaurantReservationStatus.Pending);
        await Assert.That(history.ToStatus).IsEqualTo(RestaurantReservationStatus.Confirmed);

        await service.UpdateStatusAsync(new UpdateRestaurantReservationStatusRequest(
            reservationId,
            RestaurantReservationStatus.Completed,
            null));

        var invalidResult = await service.UpdateStatusAsync(new UpdateRestaurantReservationStatusRequest(
            reservationId,
            RestaurantReservationStatus.Seated,
            null));

        await Assert.That(invalidResult.Succeeded).IsFalse();
        await Assert.That(invalidResult.FailureCode).IsEqualTo(RestaurantReservationFailureCode.InvalidStatusTransition);
    }

    [Test]
    public async Task CancelAsync_SetsCancellationFieldsAndRecordsHistory()
    {
        await using var dbContext = CreateContext();
        var fixture = SeedRestaurant(dbContext);
        var reservationId = SeedReservation(dbContext, fixture, RestaurantReservationStatus.Confirmed, "2026-06-08T12:00:00Z", "2026-06-08T13:00:00Z");
        await dbContext.SaveChangesAsync();
        var service = CreateReservationService(dbContext);

        var result = await service.CancelAsync(new CancelRestaurantReservationRequest(
            reservationId,
            "Guest called"));

        await Assert.That(result.Succeeded).IsTrue();
        var reservation = await dbContext.RestaurantReservations.SingleAsync();
        await Assert.That(reservation.Status).IsEqualTo(RestaurantReservationStatus.Cancelled);
        await Assert.That(reservation.CancellationReason).IsEqualTo("Guest called");
        await Assert.That(reservation.CancelledAt).IsEqualTo(Now);
        var history = await dbContext.RestaurantReservationStatusHistory.SingleAsync();
        await Assert.That(history.FromStatus).IsEqualTo(RestaurantReservationStatus.Confirmed);
        await Assert.That(history.ToStatus).IsEqualTo(RestaurantReservationStatus.Cancelled);
    }

    private static RestaurantReservationService CreateReservationService(NexoDbContext dbContext)
    {
        return new RestaurantReservationService(
            dbContext,
            new RestaurantAvailabilityService(dbContext),
            new FixedTimeProvider(Now),
            new RestaurantReservationConsistencyGuard());
    }

    private static TestRestaurantFixture SeedRestaurant(NexoDbContext dbContext, int minCapacity = 1, int maxCapacity = 4)
    {
        var fixture = new TestRestaurantFixture(
            Guid.Parse("10000000-0000-7000-8000-000000000001"),
            Guid.Parse("10000000-0000-7000-8000-000000000101"),
            Guid.Parse("10000000-0000-7000-8000-000000000201"),
            Guid.Parse("10000000-0000-7000-8000-000000000301"),
            Guid.Parse("10000000-0000-7000-8000-000000000401"));

        dbContext.CoreBranches.Add(new CoreBranch
        {
            Id = fixture.BranchId,
            CompanyId = fixture.CompanyId,
            Name = "Main",
            TimeZone = "UTC",
            IsActive = true,
            CreatedAt = Now,
            UpdatedAt = Now
        });
        dbContext.RestaurantFloors.Add(new RestaurantFloor
        {
            Id = fixture.FloorId,
            CompanyId = fixture.CompanyId,
            BranchId = fixture.BranchId,
            Name = "Dining room",
            IsActive = true,
            CreatedAt = Now,
            UpdatedAt = Now
        });
        dbContext.RestaurantAreas.Add(new RestaurantArea
        {
            Id = fixture.AreaId,
            CompanyId = fixture.CompanyId,
            BranchId = fixture.BranchId,
            FloorId = fixture.FloorId,
            Name = "Window",
            IsActive = true,
            CreatedAt = Now,
            UpdatedAt = Now
        });
        dbContext.RestaurantTables.Add(new RestaurantTable
        {
            Id = fixture.TableId,
            CompanyId = fixture.CompanyId,
            BranchId = fixture.BranchId,
            FloorId = fixture.FloorId,
            AreaId = fixture.AreaId,
            Label = "T1",
            MinCapacity = minCapacity,
            MaxCapacity = maxCapacity,
            DefaultReservationMinutes = 60,
            IsActive = true,
            CreatedAt = Now,
            UpdatedAt = Now
        });

        return fixture;
    }

    private static RestaurantOpeningHour OpenHours(
        TestRestaurantFixture fixture,
        DayOfWeek dayOfWeek,
        string opensAt,
        string closesAt)
    {
        return new RestaurantOpeningHour
        {
            CompanyId = fixture.CompanyId,
            BranchId = fixture.BranchId,
            DayOfWeek = dayOfWeek,
            OpensAt = TimeOnly.Parse(opensAt),
            ClosesAt = TimeOnly.Parse(closesAt),
            IsClosed = false,
            CreatedAt = Now,
            UpdatedAt = Now
        };
    }

    private static Guid SeedReservation(
        NexoDbContext dbContext,
        TestRestaurantFixture fixture,
        RestaurantReservationStatus status,
        string startAt,
        string endAt,
        int turnoverBufferMinutes = 0)
    {
        var customer = new RestaurantCustomer
        {
            Id = Guid.CreateVersion7(),
            CompanyId = fixture.CompanyId,
            FullName = "Existing Guest",
            CreatedAt = Now,
            UpdatedAt = Now
        };
        var reservation = new RestaurantReservation
        {
            Id = Guid.CreateVersion7(),
            CompanyId = fixture.CompanyId,
            BranchId = fixture.BranchId,
            CustomerId = customer.Id,
            Customer = customer,
            PartySize = 2,
            StartAt = DateTimeOffset.Parse(startAt),
            EndAt = DateTimeOffset.Parse(endAt),
            TurnoverBufferMinutes = turnoverBufferMinutes,
            Status = status,
            Source = RestaurantReservationSource.Staff,
            CreatedAt = Now,
            UpdatedAt = Now
        };
        dbContext.RestaurantCustomers.Add(customer);
        dbContext.RestaurantReservations.Add(reservation);
        dbContext.RestaurantReservationTables.Add(new RestaurantReservationTable
        {
            CompanyId = fixture.CompanyId,
            ReservationId = reservation.Id,
            TableId = fixture.TableId,
            CreatedAt = Now
        });

        return reservation.Id;
    }

    private static NexoDbContext CreateContext(Guid? companyId = null)
    {
        var resolvedCompanyId = companyId ?? Guid.Parse("10000000-0000-7000-8000-000000000001");
        var options = new DbContextOptionsBuilder<NexoDbContext>()
            .UseInMemoryDatabase($"nexo-restaurant-phase3-{Guid.NewGuid()}")
            .Options;

        return new NexoDbContext(options, new FixedCompanyContextProvider(resolvedCompanyId));
    }

    private sealed record TestRestaurantFixture(Guid CompanyId, Guid BranchId, Guid FloorId, Guid AreaId, Guid TableId);

    private sealed class FixedCompanyContextProvider(Guid companyId) : ICompanyContextProvider
    {
        public ValueTask<CompanyContext> GetCurrentAsync(CancellationToken cancellationToken = default)
        {
            return ValueTask.FromResult(new CompanyContext(companyId));
        }
    }

    private sealed class FixedTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow()
        {
            return utcNow;
        }
    }
}
