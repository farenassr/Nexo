using Microsoft.EntityFrameworkCore;
using Nexo.Server.Modules.Restaurant.Features.Setup;
using Nexo.Shared.Restaurant;

namespace Nexo.Server.Data;

public sealed class DevelopmentDatabaseInitializer(
    IServiceProvider serviceProvider,
    IHostEnvironment environment,
    ILogger<DevelopmentDatabaseInitializer> logger) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        if (!environment.IsDevelopment())
        {
            return;
        }

        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<NexoDbContext>();
        if (dbContext.Database.ProviderName is null)
        {
            logger.LogInformation("Skipping development database initialization because no EF provider is configured.");
            return;
        }

        await dbContext.Database.EnsureCreatedAsync(cancellationToken);

        var setupService = scope.ServiceProvider.GetRequiredService<RestaurantSetupService>();
        var snapshot = await setupService.GetSnapshotAsync(cancellationToken);
        if (snapshot.Branches.Count > 0)
        {
            return;
        }

        var branch = await setupService.CreateBranchAsync(
            new CreateRestaurantBranchRequest("Sucursal Principal", "Local development", "UTC"),
            cancellationToken);
        var floor = await setupService.CreateFloorAsync(
            new CreateRestaurantFloorRequest(branch.Branch!.Id, "Salon principal", 1),
            cancellationToken);
        var area = await setupService.CreateAreaAsync(
            new CreateRestaurantAreaRequest(branch.Branch.Id, floor.Floor!.Id, "Comedor", RestaurantAreaType.DiningRoom, 1),
            cancellationToken);

        foreach (var (label, minCapacity, maxCapacity, shape) in new[]
        {
            ("A1", 1, 2, RestaurantTableShape.Square),
            ("A2", 2, 4, RestaurantTableShape.Rectangle),
            ("A3", 2, 4, RestaurantTableShape.Round),
            ("B1", 4, 6, RestaurantTableShape.Rectangle)
        })
        {
            await setupService.CreateTableAsync(
                new CreateRestaurantTableRequest(
                    branch.Branch.Id,
                    floor.Floor.Id,
                    area.Area!.Id,
                    label,
                    minCapacity,
                    maxCapacity,
                    90,
                    shape),
                cancellationToken);
        }

        await setupService.CreateFloorPlanAsync(
            new CreateRestaurantFloorPlanRequest(branch.Branch.Id, floor.Floor.Id, "Plano principal", 1200, 760, 20, true),
            cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}
