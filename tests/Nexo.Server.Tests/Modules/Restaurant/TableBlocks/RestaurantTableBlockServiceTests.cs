using Microsoft.EntityFrameworkCore;
using Nexo.Server.Data;
using Nexo.Server.Modules.Core.CompanyContext;
using Nexo.Server.Modules.Core.Data.Entities;
using Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;
using Nexo.Server.Modules.Restaurant.Features.TableBlocks;
using Nexo.Shared.Restaurant;
using TUnit.Assertions;
using TUnit.Core;

namespace Nexo.Server.Tests.Modules.Restaurant.TableBlocks;

public sealed class RestaurantTableBlockServiceTests
{
    private static readonly DateTimeOffset Now = DateTimeOffset.Parse("2026-06-08T10:00:00Z");

    [Test]
    public async Task CreateAsync_CreatesScopedTableBlock()
    {
        await using var dbContext = CreateContext();
        var fixture = SeedRestaurant(dbContext);
        await dbContext.SaveChangesAsync();
        var service = new RestaurantTableBlockService(dbContext, new FixedTimeProvider(Now));

        var result = await service.CreateAsync(new CreateRestaurantTableBlockRequest(
            fixture.BranchId,
            fixture.FloorId,
            fixture.AreaId,
            fixture.TableId,
            DateTimeOffset.Parse("2026-06-08T18:30:00Z"),
            DateTimeOffset.Parse("2026-06-08T20:00:00Z"),
            "VIP hold"));

        await Assert.That(result.Succeeded).IsTrue();
        await Assert.That(result.Block).IsNotNull();
        var block = await dbContext.RestaurantTableBlocks.SingleAsync();
        await Assert.That(block.CompanyId).IsEqualTo(fixture.CompanyId);
        await Assert.That(block.BranchId).IsEqualTo(fixture.BranchId);
        await Assert.That(block.TableId).IsEqualTo(fixture.TableId);
        await Assert.That(block.Reason).IsEqualTo("VIP hold");
        await Assert.That(block.CreatedAt).IsEqualTo(Now);
        await Assert.That(block.UpdatedAt).IsEqualTo(Now);
    }

    [Test]
    public async Task CreateAsync_RejectsTableOutsideCurrentCompanyScope()
    {
        await using var dbContext = CreateContext();
        var fixture = SeedRestaurant(dbContext);
        dbContext.RestaurantTables.Add(new RestaurantTable
        {
            Id = Guid.Parse("20000000-0000-7000-8000-000000000401"),
            CompanyId = Guid.Parse("20000000-0000-7000-8000-000000000001"),
            BranchId = fixture.BranchId,
            FloorId = fixture.FloorId,
            Label = "Hidden",
            MinCapacity = 1,
            MaxCapacity = 4,
            IsActive = true,
            CreatedAt = Now,
            UpdatedAt = Now
        });
        await dbContext.SaveChangesAsync();
        var service = new RestaurantTableBlockService(dbContext, new FixedTimeProvider(Now));

        var result = await service.CreateAsync(new CreateRestaurantTableBlockRequest(
            fixture.BranchId,
            fixture.FloorId,
            fixture.AreaId,
            Guid.Parse("20000000-0000-7000-8000-000000000401"),
            DateTimeOffset.Parse("2026-06-08T18:30:00Z"),
            DateTimeOffset.Parse("2026-06-08T20:00:00Z"),
            null));

        await Assert.That(result.Succeeded).IsFalse();
        await Assert.That(result.FailureCode).IsEqualTo(RestaurantTableBlockFailureCode.NotFound);
        await Assert.That(await dbContext.RestaurantTableBlocks.CountAsync()).IsEqualTo(0);
    }

    private static TestRestaurantFixture SeedRestaurant(NexoDbContext dbContext)
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
            MinCapacity = 1,
            MaxCapacity = 4,
            IsActive = true,
            CreatedAt = Now,
            UpdatedAt = Now
        });

        return fixture;
    }

    private static NexoDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<NexoDbContext>()
            .UseInMemoryDatabase($"nexo-restaurant-table-blocks-{Guid.NewGuid()}")
            .Options;

        return new NexoDbContext(options, new FixedCompanyContextProvider(Guid.Parse("10000000-0000-7000-8000-000000000001")));
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
