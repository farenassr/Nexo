using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Nexo.Server.Data;
using Nexo.Server.Modules.Core.OrganizationContext;
using Nexo.Server.Modules.Core.Data.Entities;
using Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;
using TUnit.Assertions;
using TUnit.Core;

namespace Nexo.Server.Tests.Modules.Restaurant.Data;

public sealed class RestaurantModelTests
{
    [Test]
    public async Task Model_MapsRestaurantTablesToRestaurantSchema()
    {
        await using var dbContext = CreateRelationalContext(Guid.Parse("10000000-0000-7000-8000-000000000001"));

        await AssertTable(dbContext, typeof(RestaurantFloor), "restaurant", "floors");
        await AssertTable(dbContext, typeof(RestaurantArea), "restaurant", "areas");
        await AssertTable(dbContext, typeof(RestaurantTable), "restaurant", "tables");
        await AssertTable(dbContext, typeof(RestaurantOpeningHour), "restaurant", "opening_hours");
        await AssertTable(dbContext, typeof(RestaurantSpecialDay), "restaurant", "special_days");
        await AssertTable(dbContext, typeof(RestaurantCustomer), "restaurant", "customers");
        await AssertTable(dbContext, typeof(RestaurantReservation), "restaurant", "reservations");
        await AssertTable(dbContext, typeof(RestaurantReservationTable), "restaurant", "reservation_tables");
        await AssertTable(dbContext, typeof(RestaurantReservationStatusHistory), "restaurant", "reservation_status_history");
        await AssertTable(dbContext, typeof(RestaurantTableBlock), "restaurant", "table_blocks");
        await AssertTable(dbContext, typeof(RestaurantFloorPlan), "restaurant", "floor_plans");
        await AssertTable(dbContext, typeof(RestaurantAreaLayout), "restaurant", "area_layouts");
        await AssertTable(dbContext, typeof(RestaurantTableLayout), "restaurant", "table_layouts");
        await AssertTable(dbContext, typeof(RestaurantTableSeatLayout), "restaurant", "table_seat_layouts");
    }

    [Test]
    public async Task Model_MapsMinimalCoreBranchesToCoreSchema()
    {
        await using var dbContext = CreateRelationalContext(Guid.Parse("10000000-0000-7000-8000-000000000002"));

        var entityType = dbContext.Model.FindEntityType(typeof(CoreBranch));

        await Assert.That(entityType).IsNotNull();
        await Assert.That(entityType!.GetSchema()).IsEqualTo("core");
        await Assert.That(entityType.GetTableName()).IsEqualTo("branches");
    }

    [Test]
    public async Task Model_ConfiguresReservationToUseMultipleTables()
    {
        await using var dbContext = CreateRelationalContext(Guid.Parse("10000000-0000-7000-8000-000000000003"));

        var reservationTableEntity = dbContext.Model.FindEntityType(typeof(RestaurantReservationTable));

        await Assert.That(reservationTableEntity).IsNotNull();
        var primaryKeyProperties = reservationTableEntity!.FindPrimaryKey()!.Properties
            .Select(static property => property.Name)
            .ToArray();

        await Assert.That(primaryKeyProperties).IsEquivalentTo(["ReservationId", "TableId"]);
        await Assert.That(reservationTableEntity.GetForeignKeys().Any(static key => key.PrincipalEntityType.ClrType == typeof(RestaurantReservation))).IsTrue();
        await Assert.That(reservationTableEntity.GetForeignKeys().Any(static key => key.PrincipalEntityType.ClrType == typeof(RestaurantTable))).IsTrue();
    }

    [Test]
    public async Task RestaurantQueries_FilterRowsToCurrentOrganization()
    {
        var currentOrganizationId = Guid.Parse("20000000-0000-7000-8000-000000000001");
        var otherOrganizationId = Guid.Parse("20000000-0000-7000-8000-000000000002");

        await using var dbContext = CreateInMemoryContext(currentOrganizationId);
        dbContext.RestaurantCustomers.AddRange(
            new RestaurantCustomer
            {
                Id = Guid.Parse("30000000-0000-7000-8000-000000000001"),
                OrganizationId = currentOrganizationId,
                FullName = "Visible customer",
                CreatedAt = DateTimeOffset.Parse("2026-01-01T00:00:00Z"),
                UpdatedAt = DateTimeOffset.Parse("2026-01-01T00:00:00Z")
            },
            new RestaurantCustomer
            {
                Id = Guid.Parse("30000000-0000-7000-8000-000000000002"),
                OrganizationId = otherOrganizationId,
                FullName = "Hidden customer",
                CreatedAt = DateTimeOffset.Parse("2026-01-01T00:00:00Z"),
                UpdatedAt = DateTimeOffset.Parse("2026-01-01T00:00:00Z")
            });
        await dbContext.SaveChangesAsync();

        var customers = await dbContext.RestaurantCustomers.ToListAsync();

        await Assert.That(customers).Count().IsEqualTo(1);
        await Assert.That(customers[0].OrganizationId).IsEqualTo(currentOrganizationId);
    }

    [Test]
    public async Task Constructor_DoesNotResolveOrganizationBeforeTenantScopeIsNeeded()
    {
        var options = new DbContextOptionsBuilder<NexoDbContext>()
            .UseInMemoryDatabase($"nexo-restaurant-model-{Guid.NewGuid()}")
            .Options;

        await using var dbContext = new NexoDbContext(options, new ThrowingOrganizationContextProvider());

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => Task.FromResult(dbContext.CurrentOrganizationId));

        await Assert.That(exception!.Message).Contains("No organization context was available.");
    }

    private static async Task AssertTable(
        NexoDbContext dbContext,
        Type clrType,
        string schema,
        string tableName)
    {
        var entityType = dbContext.Model.FindEntityType(clrType);

        await Assert.That(entityType).IsNotNull();
        await Assert.That(entityType!.GetSchema()).IsEqualTo(schema);
        await Assert.That(entityType.GetTableName()).IsEqualTo(tableName);
        await Assert.That(HasOrganizationColumn(entityType)).IsTrue();
    }

    private static bool HasOrganizationColumn(IEntityType entityType)
    {
        var storeObject = StoreObjectIdentifier.Table(entityType.GetTableName()!, entityType.GetSchema());

        return entityType.FindProperty("OrganizationId")?.GetColumnName(storeObject) == "organization_id";
    }

    private static NexoDbContext CreateRelationalContext(Guid organizationId)
    {
        var options = new DbContextOptionsBuilder<NexoDbContext>()
            .UseNpgsql("Host=localhost;Database=nexo_model_tests;Username=nexo;Password=nexo")
            .Options;

        return new NexoDbContext(options, new FixedOrganizationContextProvider(organizationId));
    }

    private static NexoDbContext CreateInMemoryContext(Guid organizationId)
    {
        var options = new DbContextOptionsBuilder<NexoDbContext>()
            .UseInMemoryDatabase($"nexo-restaurant-model-{Guid.NewGuid()}")
            .Options;

        return new NexoDbContext(options, new FixedOrganizationContextProvider(organizationId));
    }

    private sealed class FixedOrganizationContextProvider(Guid organizationId) : IOrganizationContextProvider
    {
        public ValueTask<OrganizationContext> GetCurrentAsync(CancellationToken cancellationToken = default)
        {
            return ValueTask.FromResult(new OrganizationContext(organizationId));
        }
    }

    private sealed class ThrowingOrganizationContextProvider : IOrganizationContextProvider
    {
        public ValueTask<OrganizationContext> GetCurrentAsync(CancellationToken cancellationToken = default)
        {
            throw new InvalidOperationException("No organization context was available.");
        }
    }
}
