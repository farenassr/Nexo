using Microsoft.EntityFrameworkCore;
using Nexo.Server.Data;
using Nexo.Server.Modules.Core.CompanyContext;
using Nexo.Server.Modules.Restaurant.Features.Setup;
using Nexo.Shared.Restaurant;
using TUnit.Assertions;
using TUnit.Core;

namespace Nexo.Server.Tests.Modules.Restaurant.Setup;

public sealed class RestaurantSetupServiceTests
{
    private static readonly Guid CompanyId = Guid.Parse("10000000-0000-7000-8000-000000000001");
    private static readonly DateTimeOffset Now = DateTimeOffset.Parse("2026-06-09T10:00:00Z");

    [Test]
    public async Task CreateWorkflow_CreatesBranchFloorAreaTableAndFloorPlanInsideCompanyScope()
    {
        await using var dbContext = CreateContext();
        var service = new RestaurantSetupService(dbContext, new FixedTimeProvider(Now));

        var branch = await service.CreateBranchAsync(
            new CreateRestaurantBranchRequest("Centro", "Calle 1", "America/Santo_Domingo"),
            CancellationToken.None);
        var floor = await service.CreateFloorAsync(
            new CreateRestaurantFloorRequest(branch.Branch!.Id, "Salon principal", 1),
            CancellationToken.None);
        var area = await service.CreateAreaAsync(
            new CreateRestaurantAreaRequest(branch.Branch.Id, floor.Floor!.Id, "Ventanas", RestaurantAreaType.DiningRoom, 1),
            CancellationToken.None);
        var table = await service.CreateTableAsync(
            new CreateRestaurantTableRequest(
                branch.Branch.Id,
                floor.Floor.Id,
                area.Area!.Id,
                "A1",
                1,
                4,
                90,
                RestaurantTableShape.Rectangle),
            CancellationToken.None);
        var floorPlan = await service.CreateFloorPlanAsync(
            new CreateRestaurantFloorPlanRequest(branch.Branch.Id, floor.Floor.Id, "Cena", 1200, 760, 20, true),
            CancellationToken.None);

        await Assert.That(branch.Succeeded).IsTrue();
        await Assert.That(floor.Succeeded).IsTrue();
        await Assert.That(area.Succeeded).IsTrue();
        await Assert.That(table.Succeeded).IsTrue();
        await Assert.That(floorPlan.Succeeded).IsTrue();
        await Assert.That(branch.Branch.CompanyId).IsEqualTo(CompanyId);
        await Assert.That(table.Table!.CompanyId).IsEqualTo(CompanyId);
        await Assert.That(await dbContext.RestaurantOpeningHours.CountAsync()).IsEqualTo(7);
        await Assert.That(floorPlan.FloorPlan!.TableLayouts.Single().TableId).IsEqualTo(table.Table.Id);
        await Assert.That(floorPlan.FloorPlan.AreaLayouts.Single().AreaId).IsEqualTo(area.Area.Id);
    }

    [Test]
    public async Task CreateTableAsync_RejectsAreaOutsideFloor()
    {
        await using var dbContext = CreateContext();
        var service = new RestaurantSetupService(dbContext, new FixedTimeProvider(Now));
        var branch = await service.CreateBranchAsync(new CreateRestaurantBranchRequest("Centro", null, "UTC"), CancellationToken.None);
        var mainFloor = await service.CreateFloorAsync(new CreateRestaurantFloorRequest(branch.Branch!.Id, "Main", 1), CancellationToken.None);
        var patioFloor = await service.CreateFloorAsync(new CreateRestaurantFloorRequest(branch.Branch.Id, "Patio", 2), CancellationToken.None);
        var patioArea = await service.CreateAreaAsync(
            new CreateRestaurantAreaRequest(branch.Branch.Id, patioFloor.Floor!.Id, "Patio", RestaurantAreaType.Outdoor, 1),
            CancellationToken.None);

        var result = await service.CreateTableAsync(
            new CreateRestaurantTableRequest(
                branch.Branch.Id,
                mainFloor.Floor!.Id,
                patioArea.Area!.Id,
                "A1",
                1,
                4,
                null,
                RestaurantTableShape.Rectangle),
            CancellationToken.None);

        await Assert.That(result.Succeeded).IsFalse();
        await Assert.That(result.FailureCode).IsEqualTo(RestaurantSetupFailureCode.NotFound);
        await Assert.That(await dbContext.RestaurantTables.CountAsync()).IsEqualTo(0);
    }

    [Test]
    public async Task GetSnapshotAsync_ReturnsOnlyCurrentCompanySetup()
    {
        await using var dbContext = CreateContext();
        var service = new RestaurantSetupService(dbContext, new FixedTimeProvider(Now));
        await service.CreateBranchAsync(new CreateRestaurantBranchRequest("Visible", null, "UTC"), CancellationToken.None);

        dbContext.CoreBranches.Add(new()
        {
            Id = Guid.Parse("20000000-0000-7000-8000-000000000101"),
            CompanyId = Guid.Parse("20000000-0000-7000-8000-000000000001"),
            Name = "Hidden",
            TimeZone = "UTC",
            IsActive = true,
            CreatedAt = Now,
            UpdatedAt = Now
        });
        await dbContext.SaveChangesAsync();

        var snapshot = await service.GetSnapshotAsync(CancellationToken.None);

        await Assert.That(snapshot.Branches).Count().IsEqualTo(1);
        await Assert.That(snapshot.Branches.Single().Name).IsEqualTo("Visible");
    }

    [Test]
    public async Task DeleteAreaAsync_RemovesAreaLayoutsAndClearsTables()
    {
        await using var dbContext = CreateContext();
        var service = new RestaurantSetupService(dbContext, new FixedTimeProvider(Now));
        var branch = await service.CreateBranchAsync(new CreateRestaurantBranchRequest("Centro", null, "UTC"), CancellationToken.None);
        var floor = await service.CreateFloorAsync(new CreateRestaurantFloorRequest(branch.Branch!.Id, "Main", 1), CancellationToken.None);
        var area = await service.CreateAreaAsync(
            new CreateRestaurantAreaRequest(branch.Branch.Id, floor.Floor!.Id, "Comedor", RestaurantAreaType.DiningRoom, 1),
            CancellationToken.None);
        var table = await service.CreateTableAsync(
            new CreateRestaurantTableRequest(branch.Branch.Id, floor.Floor.Id, area.Area!.Id, "A1", 1, 4, 90, RestaurantTableShape.Rectangle),
            CancellationToken.None);
        await service.CreateFloorPlanAsync(new CreateRestaurantFloorPlanRequest(branch.Branch.Id, floor.Floor.Id, "Plano", 1200, 760, 20, true), CancellationToken.None);

        var result = await service.DeleteAreaAsync(area.Area.Id, CancellationToken.None);

        await Assert.That(result.Succeeded).IsTrue();
        await Assert.That(await dbContext.RestaurantAreas.CountAsync()).IsEqualTo(0);
        await Assert.That(await dbContext.RestaurantAreaLayouts.CountAsync()).IsEqualTo(0);
        await Assert.That((await dbContext.RestaurantTables.SingleAsync(tableEntity => tableEntity.Id == table.Table!.Id)).AreaId).IsNull();
    }

    [Test]
    public async Task DeleteBranchAsync_RemovesRestaurantSetupTreeForBranch()
    {
        await using var dbContext = CreateContext();
        var service = new RestaurantSetupService(dbContext, new FixedTimeProvider(Now));
        var branch = await service.CreateBranchAsync(new CreateRestaurantBranchRequest("Centro", null, "UTC"), CancellationToken.None);
        var floor = await service.CreateFloorAsync(new CreateRestaurantFloorRequest(branch.Branch!.Id, "Main", 1), CancellationToken.None);
        var area = await service.CreateAreaAsync(
            new CreateRestaurantAreaRequest(branch.Branch.Id, floor.Floor!.Id, "Comedor", RestaurantAreaType.DiningRoom, 1),
            CancellationToken.None);
        await service.CreateTableAsync(
            new CreateRestaurantTableRequest(branch.Branch.Id, floor.Floor.Id, area.Area!.Id, "A1", 1, 4, 90, RestaurantTableShape.Rectangle),
            CancellationToken.None);
        await service.CreateFloorPlanAsync(new CreateRestaurantFloorPlanRequest(branch.Branch.Id, floor.Floor.Id, "Plano", 1200, 760, 20, true), CancellationToken.None);

        var result = await service.DeleteBranchAsync(branch.Branch.Id, CancellationToken.None);

        await Assert.That(result.Succeeded).IsTrue();
        await Assert.That(await dbContext.CoreBranches.CountAsync()).IsEqualTo(0);
        await Assert.That(await dbContext.RestaurantFloors.CountAsync()).IsEqualTo(0);
        await Assert.That(await dbContext.RestaurantAreas.CountAsync()).IsEqualTo(0);
        await Assert.That(await dbContext.RestaurantTables.CountAsync()).IsEqualTo(0);
        await Assert.That(await dbContext.RestaurantFloorPlans.CountAsync()).IsEqualTo(0);
        await Assert.That(await dbContext.RestaurantOpeningHours.CountAsync()).IsEqualTo(0);
    }

    private static NexoDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<NexoDbContext>()
            .UseInMemoryDatabase($"nexo-restaurant-setup-{Guid.NewGuid()}")
            .Options;

        return new NexoDbContext(options, new FixedCompanyContextProvider(CompanyId));
    }

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
