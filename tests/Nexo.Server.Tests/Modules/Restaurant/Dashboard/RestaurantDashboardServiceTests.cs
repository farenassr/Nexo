using Microsoft.EntityFrameworkCore;
using Nexo.Server.Data;
using Nexo.Server.Modules.Core.OrganizationContext;
using Nexo.Server.Modules.Core.Data.Entities;
using Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;
using Nexo.Server.Modules.Restaurant.Features.Dashboard;
using Nexo.Shared.Restaurant;
using TUnit.Assertions;
using TUnit.Core;

namespace Nexo.Server.Tests.Modules.Restaurant.Dashboard;

public sealed class RestaurantDashboardServiceTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.Parse("2026-06-08T10:30:00Z");

    [Test]
    public async Task GetAsync_ComputesDailyMetricsOccupancyAndUpcomingReservations()
    {
        await using var dbContext = CreateContext();
        var fixture = SeedRestaurant(dbContext);
        SeedReservation(dbContext, fixture, fixture.Table1Id, RestaurantReservationStatus.Seated, "2026-06-08T10:00:00Z", "2026-06-08T12:00:00Z", 2, "Current Guest");
        var upcomingReservationId = SeedReservation(dbContext, fixture, fixture.Table2Id, RestaurantReservationStatus.Confirmed, "2026-06-08T13:00:00Z", "2026-06-08T14:00:00Z", 4, "Upcoming Guest");
        SeedReservation(dbContext, fixture, fixture.Table3Id, RestaurantReservationStatus.Cancelled, "2026-06-08T15:00:00Z", "2026-06-08T16:00:00Z", 3, "Cancelled Guest");
        SeedReservation(dbContext, fixture, fixture.Table3Id, RestaurantReservationStatus.NoShow, "2026-06-08T16:00:00Z", "2026-06-08T17:00:00Z", 2, "No Show Guest");
        await dbContext.SaveChangesAsync();
        var service = new RestaurantDashboardService(dbContext, new FixedTimeProvider(Now));

        var result = await service.GetAsync(new RestaurantDashboardRequest(fixture.BranchId, DateOnly.Parse("2026-06-08")));

        var metrics = result.Metrics.ToDictionary(static metric => metric.Key, static metric => metric.Value);
        await Assert.That(metrics["todayReservations"]).IsEqualTo(4);
        await Assert.That(metrics["occupiedTables"]).IsEqualTo(1);
        await Assert.That(metrics["freeTables"]).IsEqualTo(2);
        await Assert.That(metrics["upcomingReservations"]).IsEqualTo(1);
        await Assert.That(metrics["cancellations"]).IsEqualTo(1);
        await Assert.That(metrics["noShows"]).IsEqualTo(1);
        await Assert.That(result.OccupancyByHour.Single(point => point.Hour == 10).OccupancyPercent).IsEqualTo(17);
        await Assert.That(result.OccupancyByHour.Single(point => point.Hour == 13).OccupancyPercent).IsEqualTo(33);
        await Assert.That(result.UpcomingReservations.Single().ReservationId).IsEqualTo(upcomingReservationId);
        await Assert.That(result.UpcomingReservations.Single().TableLabels).Contains("T2");
    }

    [Test]
    public async Task GetAsync_ReturnsZeroStateForEmptyDays()
    {
        await using var dbContext = CreateContext();
        var fixture = SeedRestaurant(dbContext);
        await dbContext.SaveChangesAsync();
        var service = new RestaurantDashboardService(dbContext, new FixedTimeProvider(Now));

        var result = await service.GetAsync(new RestaurantDashboardRequest(fixture.BranchId, DateOnly.Parse("2026-06-09")));

        await Assert.That(result.Metrics.All(static metric => metric.Value == 0 || metric.Key == "freeTables")).IsTrue();
        await Assert.That(result.Metrics.Single(static metric => metric.Key == "freeTables").Value).IsEqualTo(3);
        await Assert.That(result.OccupancyByHour).Count().IsEqualTo(24);
        await Assert.That(result.OccupancyByHour.All(static point => point.OccupancyPercent == 0)).IsTrue();
        await Assert.That(result.UpcomingReservations).IsEmpty();
    }

    [Test]
    public async Task GetAsync_UsesCurrentCompanyFilter()
    {
        await using var dbContext = CreateContext();
        var fixture = SeedRestaurant(dbContext);
        var otherOrganizationId = Guid.Parse("20000000-0000-7000-8000-000000000001");
        dbContext.RestaurantTables.Add(new RestaurantTable
        {
            Id = Guid.Parse("20000000-0000-7000-8000-000000000401"),
            OrganizationId = otherOrganizationId,
            BranchId = fixture.BranchId,
            FloorId = fixture.FloorId,
            Label = "Hidden",
            MinCapacity = 1,
            MaxCapacity = 20,
            IsActive = true,
            CreatedAt = Now,
            UpdatedAt = Now
        });
        SeedReservation(dbContext, fixture with { OrganizationId = otherOrganizationId, Table1Id = Guid.Parse("20000000-0000-7000-8000-000000000401") }, fixture.Table1Id, RestaurantReservationStatus.Confirmed, "2026-06-08T11:00:00Z", "2026-06-08T12:00:00Z", 10, "Hidden Guest");
        await dbContext.SaveChangesAsync();
        var service = new RestaurantDashboardService(dbContext, new FixedTimeProvider(Now));

        var result = await service.GetAsync(new RestaurantDashboardRequest(fixture.BranchId, DateOnly.Parse("2026-06-08")));

        await Assert.That(result.Metrics.Single(static metric => metric.Key == "todayReservations").Value).IsEqualTo(0);
        await Assert.That(result.Metrics.Single(static metric => metric.Key == "freeTables").Value).IsEqualTo(3);
    }

    private static TestRestaurantFixture SeedRestaurant(NexoDbContext dbContext)
    {
        var fixture = new TestRestaurantFixture(
            Guid.Parse("10000000-0000-7000-8000-000000000001"),
            Guid.Parse("10000000-0000-7000-8000-000000000101"),
            Guid.Parse("10000000-0000-7000-8000-000000000201"),
            Guid.Parse("10000000-0000-7000-8000-000000000401"),
            Guid.Parse("10000000-0000-7000-8000-000000000402"),
            Guid.Parse("10000000-0000-7000-8000-000000000403"));

        dbContext.CoreBranches.Add(new CoreBranch
        {
            Id = fixture.BranchId,
            OrganizationId = fixture.OrganizationId,
            Name = "Main",
            TimeZone = "UTC",
            IsActive = true,
            CreatedAt = Now,
            UpdatedAt = Now
        });
        dbContext.RestaurantFloors.Add(new RestaurantFloor
        {
            Id = fixture.FloorId,
            OrganizationId = fixture.OrganizationId,
            BranchId = fixture.BranchId,
            Name = "Dining room",
            IsActive = true,
            CreatedAt = Now,
            UpdatedAt = Now
        });
        foreach (var (tableId, label) in new[] { (fixture.Table1Id, "T1"), (fixture.Table2Id, "T2"), (fixture.Table3Id, "T3") })
        {
            dbContext.RestaurantTables.Add(new RestaurantTable
            {
                Id = tableId,
                OrganizationId = fixture.OrganizationId,
                BranchId = fixture.BranchId,
                FloorId = fixture.FloorId,
                Label = label,
                MinCapacity = 1,
                MaxCapacity = 4,
                IsActive = true,
                CreatedAt = Now,
                UpdatedAt = Now
            });
        }

        return fixture;
    }

    private static Guid SeedReservation(
        NexoDbContext dbContext,
        TestRestaurantFixture fixture,
        Guid tableId,
        RestaurantReservationStatus status,
        string startAt,
        string endAt,
        int partySize,
        string customerName)
    {
        var customer = new RestaurantCustomer
        {
            Id = Guid.CreateVersion7(),
            OrganizationId = fixture.OrganizationId,
            FullName = customerName,
            CreatedAt = Now,
            UpdatedAt = Now
        };
        var reservation = new RestaurantReservation
        {
            Id = Guid.CreateVersion7(),
            OrganizationId = fixture.OrganizationId,
            BranchId = fixture.BranchId,
            CustomerId = customer.Id,
            Customer = customer,
            PartySize = partySize,
            StartAt = DateTimeOffset.Parse(startAt),
            EndAt = DateTimeOffset.Parse(endAt),
            Status = status,
            Source = RestaurantReservationSource.Staff,
            CreatedAt = Now,
            UpdatedAt = Now
        };

        dbContext.RestaurantCustomers.Add(customer);
        dbContext.RestaurantReservations.Add(reservation);
        dbContext.RestaurantReservationTables.Add(new RestaurantReservationTable
        {
            OrganizationId = fixture.OrganizationId,
            ReservationId = reservation.Id,
            TableId = tableId,
            Table = dbContext.RestaurantTables.Local.SingleOrDefault(table => table.Id == tableId),
            CreatedAt = Now
        });

        return reservation.Id;
    }

    private static NexoDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<NexoDbContext>()
            .UseInMemoryDatabase($"nexo-restaurant-dashboard-{Guid.NewGuid()}")
            .Options;

        return new NexoDbContext(options, new FixedOrganizationContextProvider(Guid.Parse("10000000-0000-7000-8000-000000000001")));
    }

    private sealed record TestRestaurantFixture(Guid OrganizationId, Guid BranchId, Guid FloorId, Guid Table1Id, Guid Table2Id, Guid Table3Id);

    private sealed class FixedOrganizationContextProvider(Guid organizationId) : IOrganizationContextProvider
    {
        public ValueTask<OrganizationContext> GetCurrentAsync(CancellationToken cancellationToken = default)
        {
            return ValueTask.FromResult(new OrganizationContext(organizationId));
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
