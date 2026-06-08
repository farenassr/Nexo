using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Nexo.Server.Data;
using Nexo.Server.Modules.Core.CompanyContext;
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
    public async Task RestaurantQueries_FilterRowsToCurrentCompany()
    {
        var currentCompanyId = Guid.Parse("20000000-0000-7000-8000-000000000001");
        var otherCompanyId = Guid.Parse("20000000-0000-7000-8000-000000000002");

        await using var dbContext = CreateInMemoryContext(currentCompanyId);
        dbContext.RestaurantCustomers.AddRange(
            new RestaurantCustomer
            {
                Id = Guid.Parse("30000000-0000-7000-8000-000000000001"),
                CompanyId = currentCompanyId,
                FullName = "Visible customer",
                CreatedAt = DateTimeOffset.Parse("2026-01-01T00:00:00Z"),
                UpdatedAt = DateTimeOffset.Parse("2026-01-01T00:00:00Z")
            },
            new RestaurantCustomer
            {
                Id = Guid.Parse("30000000-0000-7000-8000-000000000002"),
                CompanyId = otherCompanyId,
                FullName = "Hidden customer",
                CreatedAt = DateTimeOffset.Parse("2026-01-01T00:00:00Z"),
                UpdatedAt = DateTimeOffset.Parse("2026-01-01T00:00:00Z")
            });
        await dbContext.SaveChangesAsync();

        var customers = await dbContext.RestaurantCustomers.ToListAsync();

        await Assert.That(customers).Count().IsEqualTo(1);
        await Assert.That(customers[0].CompanyId).IsEqualTo(currentCompanyId);
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
        await Assert.That(HasCompanyColumn(entityType)).IsTrue();
    }

    private static bool HasCompanyColumn(IEntityType entityType)
    {
        var storeObject = StoreObjectIdentifier.Table(entityType.GetTableName()!, entityType.GetSchema());

        return entityType.FindProperty("CompanyId")?.GetColumnName(storeObject) == "company_id";
    }

    private static NexoDbContext CreateRelationalContext(Guid companyId)
    {
        var options = new DbContextOptionsBuilder<NexoDbContext>()
            .UseNpgsql("Host=localhost;Database=nexo_model_tests;Username=nexo;Password=nexo")
            .Options;

        return new NexoDbContext(options, new FixedCompanyContextProvider(companyId));
    }

    private static NexoDbContext CreateInMemoryContext(Guid companyId)
    {
        var options = new DbContextOptionsBuilder<NexoDbContext>()
            .UseInMemoryDatabase($"nexo-restaurant-model-{Guid.NewGuid()}")
            .Options;

        return new NexoDbContext(options, new FixedCompanyContextProvider(companyId));
    }

    private sealed class FixedCompanyContextProvider(Guid companyId) : ICompanyContextProvider
    {
        public ValueTask<CompanyContext> GetCurrentAsync(CancellationToken cancellationToken = default)
        {
            return ValueTask.FromResult(new CompanyContext(companyId));
        }
    }
}
