using Microsoft.EntityFrameworkCore;
using Nexo.Server.Data;
using Nexo.Server.Modules.Core.OrganizationContext;
using Nexo.Server.Modules.Core.Data.Entities;
using Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;
using Nexo.Server.Modules.Restaurant.Features.FloorPlans;
using Nexo.Shared.Restaurant;
using TUnit.Assertions;
using TUnit.Core;

namespace Nexo.Server.Tests.Modules.Restaurant.FloorPlans;

public sealed class RestaurantFloorPlanServiceTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.Parse("2026-06-08T10:00:00Z");

    [Test]
    public async Task ListAsync_ReturnsOnlyCurrentCompanyFloorPlans()
    {
        await using var dbContext = CreateContext();
        var fixture = SeedRestaurant(dbContext);
        dbContext.RestaurantFloorPlans.Add(new RestaurantFloorPlan
        {
            Id = fixture.FloorPlanId,
            OrganizationId = fixture.OrganizationId,
            BranchId = fixture.BranchId,
            FloorId = fixture.FloorId,
            Name = "Main dining",
            CanvasWidth = 1200,
            CanvasHeight = 800,
            GridSize = 20,
            IsActive = true,
            CreatedAt = Now,
            UpdatedAt = Now
        });
        dbContext.RestaurantFloorPlans.Add(new RestaurantFloorPlan
        {
            Id = Guid.Parse("10000000-0000-7000-8000-000000009999"),
            OrganizationId = Guid.Parse("20000000-0000-7000-8000-000000000001"),
            BranchId = fixture.BranchId,
            FloorId = fixture.FloorId,
            Name = "Hidden",
            CanvasWidth = 1200,
            CanvasHeight = 800,
            IsActive = true,
            CreatedAt = Now,
            UpdatedAt = Now
        });
        await dbContext.SaveChangesAsync();
        var service = new RestaurantFloorPlanService(dbContext, new FixedTimeProvider(Now));

        var result = await service.ListAsync(new RestaurantFloorPlanListRequest(fixture.BranchId, fixture.FloorId));

        await Assert.That(result).Count().IsEqualTo(1);
        await Assert.That(result.Single().Id).IsEqualTo(fixture.FloorPlanId);
    }

    [Test]
    public async Task SaveAsync_ReplacesMetadataAndLayoutsInsideCompanyScope()
    {
        await using var dbContext = CreateContext();
        var fixture = SeedRestaurant(dbContext);
        SeedFloorPlan(dbContext, fixture);
        await dbContext.SaveChangesAsync();
        var service = new RestaurantFloorPlanService(dbContext, new FixedTimeProvider(Now.AddHours(1)));

        var result = await service.SaveAsync(
            fixture.FloorPlanId,
            new SaveRestaurantFloorPlanRequest(
                "Dinner layout",
                1440,
                900,
                24,
                true,
                [
                    new SaveRestaurantAreaLayoutRequest(fixture.AreaId, 10, 20, 300, 220, 0, 1)
                ],
                [
                    new SaveRestaurantTableLayoutRequest(
                        fixture.TableId,
                        120,
                        140,
                        96,
                        72,
                        15,
                        RestaurantTableShape.Rectangle,
                        3,
                        [
                            new SaveRestaurantTableSeatLayoutRequest(1, 12, 18, 0),
                            new SaveRestaurantTableSeatLayoutRequest(2, 72, 18, 0)
                        ])
                ]));

        await Assert.That(result.Succeeded).IsTrue();
        var floorPlan = await dbContext.RestaurantFloorPlans
            .Include(plan => plan.AreaLayouts)
            .Include(plan => plan.TableLayouts)
            .ThenInclude(layout => layout.SeatLayouts)
            .SingleAsync(plan => plan.Id == fixture.FloorPlanId);
        await Assert.That(floorPlan.Name).IsEqualTo("Dinner layout");
        await Assert.That(floorPlan.CanvasWidth).IsEqualTo(1440);
        await Assert.That(floorPlan.UpdatedAt).IsEqualTo(Now.AddHours(1));
        await Assert.That(floorPlan.AreaLayouts).Count().IsEqualTo(1);
        await Assert.That(floorPlan.TableLayouts).Count().IsEqualTo(1);
        await Assert.That(floorPlan.TableLayouts.Single().SeatLayouts).Count().IsEqualTo(2);
    }

    [Test]
    public async Task UpdateTableLayoutAsync_RejectsTableOutsideFloorPlanFloor()
    {
        await using var dbContext = CreateContext();
        var fixture = SeedRestaurant(dbContext);
        var otherFloorId = Guid.Parse("10000000-0000-7000-8000-000000000211");
        var otherTableId = Guid.Parse("10000000-0000-7000-8000-000000000411");
        dbContext.RestaurantFloors.Add(new RestaurantFloor
        {
            Id = otherFloorId,
            OrganizationId = fixture.OrganizationId,
            BranchId = fixture.BranchId,
            Name = "Patio",
            IsActive = true,
            CreatedAt = Now,
            UpdatedAt = Now
        });
        dbContext.RestaurantTables.Add(new RestaurantTable
        {
            Id = otherTableId,
            OrganizationId = fixture.OrganizationId,
            BranchId = fixture.BranchId,
            FloorId = otherFloorId,
            Label = "P1",
            MinCapacity = 1,
            MaxCapacity = 4,
            IsActive = true,
            CreatedAt = Now,
            UpdatedAt = Now
        });
        SeedFloorPlan(dbContext, fixture);
        await dbContext.SaveChangesAsync();
        var service = new RestaurantFloorPlanService(dbContext, new FixedTimeProvider(Now));

        var result = await service.UpdateTableLayoutAsync(
            fixture.FloorPlanId,
            otherTableId,
            new SaveRestaurantTableLayoutRequest(
                otherTableId,
                20,
                30,
                80,
                60,
                0,
                RestaurantTableShape.Rectangle,
                1,
                []));

        await Assert.That(result.Succeeded).IsFalse();
        await Assert.That(result.FailureCode).IsEqualTo(RestaurantFloorPlanFailureCode.NotFound);
        await Assert.That(await dbContext.RestaurantTableLayouts.CountAsync()).IsEqualTo(0);
    }

    [Test]
    public async Task GetStatusMapAsync_AppliesDeterministicStatusPrecedence()
    {
        await using var dbContext = CreateContext();
        var fixture = SeedRestaurant(dbContext);
        SeedFloorPlan(dbContext, fixture);
        var tableIds = SeedStatusTables(dbContext, fixture);
        SeedStatusData(dbContext, fixture, tableIds);
        await dbContext.SaveChangesAsync();
        var service = new RestaurantFloorPlanService(dbContext, new FixedTimeProvider(Now));

        var statusMap = await service.GetStatusMapAsync(
            new RestaurantFloorPlanStatusMapRequest(
                fixture.FloorPlanId,
                DateTimeOffset.Parse("2026-06-08T12:00:00Z"),
                null));

        var statuses = statusMap!.Tables.ToDictionary(static table => table.TableId, static table => table.Status);
        await Assert.That(statuses[tableIds.Inactive]).IsEqualTo(RestaurantTableVisualStatus.Inactive);
        await Assert.That(statuses[tableIds.Blocked]).IsEqualTo(RestaurantTableVisualStatus.Blocked);
        await Assert.That(statuses[tableIds.Occupied]).IsEqualTo(RestaurantTableVisualStatus.Occupied);
        await Assert.That(statuses[tableIds.Reserved]).IsEqualTo(RestaurantTableVisualStatus.Reserved);
        await Assert.That(statuses[tableIds.Cleaning]).IsEqualTo(RestaurantTableVisualStatus.Cleaning);
        await Assert.That(statuses[tableIds.Available]).IsEqualTo(RestaurantTableVisualStatus.Available);
    }

    private static TestRestaurantFixture SeedRestaurant(NexoDbContext dbContext)
    {
        var fixture = new TestRestaurantFixture(
            Guid.Parse("10000000-0000-7000-8000-000000000001"),
            Guid.Parse("10000000-0000-7000-8000-000000000101"),
            Guid.Parse("10000000-0000-7000-8000-000000000201"),
            Guid.Parse("10000000-0000-7000-8000-000000000301"),
            Guid.Parse("10000000-0000-7000-8000-000000000401"),
            Guid.Parse("10000000-0000-7000-8000-000000000501"));

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
        dbContext.RestaurantAreas.Add(new RestaurantArea
        {
            Id = fixture.AreaId,
            OrganizationId = fixture.OrganizationId,
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
            OrganizationId = fixture.OrganizationId,
            BranchId = fixture.BranchId,
            FloorId = fixture.FloorId,
            AreaId = fixture.AreaId,
            Label = "T1",
            MinCapacity = 1,
            MaxCapacity = 4,
            DefaultReservationMinutes = 60,
            IsActive = true,
            CreatedAt = Now,
            UpdatedAt = Now
        });

        return fixture;
    }

    private static void SeedFloorPlan(NexoDbContext dbContext, TestRestaurantFixture fixture)
    {
        dbContext.RestaurantFloorPlans.Add(new RestaurantFloorPlan
        {
            Id = fixture.FloorPlanId,
            OrganizationId = fixture.OrganizationId,
            BranchId = fixture.BranchId,
            FloorId = fixture.FloorId,
            Name = "Main dining",
            CanvasWidth = 1200,
            CanvasHeight = 800,
            GridSize = 20,
            IsActive = true,
            CreatedAt = Now,
            UpdatedAt = Now
        });
    }

    private static StatusTableIds SeedStatusTables(NexoDbContext dbContext, TestRestaurantFixture fixture)
    {
        var tableIds = new StatusTableIds(
            fixture.TableId,
            Guid.Parse("10000000-0000-7000-8000-000000000402"),
            Guid.Parse("10000000-0000-7000-8000-000000000403"),
            Guid.Parse("10000000-0000-7000-8000-000000000404"),
            Guid.Parse("10000000-0000-7000-8000-000000000405"),
            Guid.Parse("10000000-0000-7000-8000-000000000406"));
        var rows = new[]
        {
            (tableIds.Blocked, "T2", true),
            (tableIds.Occupied, "T3", true),
            (tableIds.Reserved, "T4", true),
            (tableIds.Cleaning, "T5", true),
            (tableIds.Available, "T6", true)
        };

        foreach (var (tableId, label, isActive) in rows)
        {
            dbContext.RestaurantTables.Add(new RestaurantTable
            {
                Id = tableId,
                OrganizationId = fixture.OrganizationId,
                BranchId = fixture.BranchId,
                FloorId = fixture.FloorId,
                AreaId = fixture.AreaId,
                Label = label,
                MinCapacity = 1,
                MaxCapacity = 4,
                IsActive = isActive,
                CreatedAt = Now,
                UpdatedAt = Now
            });
        }

        dbContext.ChangeTracker
            .Entries<RestaurantTable>()
            .Single(entry => entry.Entity.Id == tableIds.Inactive)
            .Entity
            .IsActive = false;
        foreach (var tableId in new[] { tableIds.Inactive, tableIds.Blocked, tableIds.Occupied, tableIds.Reserved, tableIds.Cleaning, tableIds.Available })
        {
            dbContext.RestaurantTableLayouts.Add(new RestaurantTableLayout
            {
                OrganizationId = fixture.OrganizationId,
                FloorPlanId = fixture.FloorPlanId,
                TableId = tableId,
                X = 10,
                Y = 20,
                Width = 90,
                Height = 60,
                Shape = RestaurantTableShape.Rectangle,
                CreatedAt = Now,
                UpdatedAt = Now
            });
        }

        return tableIds;
    }

    private static void SeedStatusData(NexoDbContext dbContext, TestRestaurantFixture fixture, StatusTableIds tableIds)
    {
        dbContext.RestaurantTableBlocks.Add(new RestaurantTableBlock
        {
            OrganizationId = fixture.OrganizationId,
            BranchId = fixture.BranchId,
            TableId = tableIds.Inactive,
            StartAt = DateTimeOffset.Parse("2026-06-08T11:00:00Z"),
            EndAt = DateTimeOffset.Parse("2026-06-08T13:00:00Z"),
            Reason = "Should lose to inactive",
            IsActive = true,
            CreatedAt = Now,
            UpdatedAt = Now
        });
        dbContext.RestaurantTableBlocks.Add(new RestaurantTableBlock
        {
            OrganizationId = fixture.OrganizationId,
            BranchId = fixture.BranchId,
            TableId = tableIds.Blocked,
            StartAt = DateTimeOffset.Parse("2026-06-08T11:00:00Z"),
            EndAt = DateTimeOffset.Parse("2026-06-08T13:00:00Z"),
            Reason = "Maintenance",
            IsActive = true,
            CreatedAt = Now,
            UpdatedAt = Now
        });

        SeedReservation(dbContext, fixture, tableIds.Blocked, RestaurantReservationStatus.Seated, "2026-06-08T11:30:00Z", "2026-06-08T12:30:00Z");
        SeedReservation(dbContext, fixture, tableIds.Occupied, RestaurantReservationStatus.Seated, "2026-06-08T11:30:00Z", "2026-06-08T12:30:00Z");
        SeedReservation(dbContext, fixture, tableIds.Reserved, RestaurantReservationStatus.Confirmed, "2026-06-08T11:30:00Z", "2026-06-08T12:30:00Z");
        SeedReservation(dbContext, fixture, tableIds.Cleaning, RestaurantReservationStatus.Completed, "2026-06-08T10:30:00Z", "2026-06-08T11:45:00Z", turnoverBufferMinutes: 30);
    }

    private static void SeedReservation(
        NexoDbContext dbContext,
        TestRestaurantFixture fixture,
        Guid tableId,
        RestaurantReservationStatus status,
        string startAt,
        string endAt,
        int turnoverBufferMinutes = 0)
    {
        var customer = new RestaurantCustomer
        {
            Id = Guid.CreateVersion7(),
            OrganizationId = fixture.OrganizationId,
            FullName = "Guest",
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
            OrganizationId = fixture.OrganizationId,
            ReservationId = reservation.Id,
            TableId = tableId,
            CreatedAt = Now
        });
    }

    private static NexoDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<NexoDbContext>()
            .UseInMemoryDatabase($"nexo-restaurant-phase4-{Guid.NewGuid()}")
            .Options;

        return new NexoDbContext(options, new FixedOrganizationContextProvider(Guid.Parse("10000000-0000-7000-8000-000000000001")));
    }

    private sealed record TestRestaurantFixture(Guid OrganizationId, Guid BranchId, Guid FloorId, Guid AreaId, Guid TableId, Guid FloorPlanId);

    private sealed record StatusTableIds(Guid Inactive, Guid Blocked, Guid Occupied, Guid Reserved, Guid Cleaning, Guid Available);

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
