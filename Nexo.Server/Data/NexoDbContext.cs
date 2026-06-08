using Microsoft.EntityFrameworkCore;
using Nexo.Server.Modules.Core.CompanyContext;
using Nexo.Server.Modules.Core.Data.Configurations;
using Nexo.Server.Modules.Core.Data.Entities;
using Nexo.Server.Modules.Restaurant.Data.Configurations;
using Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;

namespace Nexo.Server.Data;

public sealed class NexoDbContext(
    DbContextOptions<NexoDbContext> options,
    ICompanyContextProvider companyContextProvider) : DbContext(options)
{
    public Guid CurrentCompanyId { get; } = ResolveCompanyId(companyContextProvider);

    public DbSet<CoreBranch> CoreBranches => Set<CoreBranch>();
    public DbSet<RestaurantFloor> RestaurantFloors => Set<RestaurantFloor>();
    public DbSet<RestaurantArea> RestaurantAreas => Set<RestaurantArea>();
    public DbSet<RestaurantTable> RestaurantTables => Set<RestaurantTable>();
    public DbSet<RestaurantOpeningHour> RestaurantOpeningHours => Set<RestaurantOpeningHour>();
    public DbSet<RestaurantSpecialDay> RestaurantSpecialDays => Set<RestaurantSpecialDay>();
    public DbSet<RestaurantCustomer> RestaurantCustomers => Set<RestaurantCustomer>();
    public DbSet<RestaurantReservation> RestaurantReservations => Set<RestaurantReservation>();
    public DbSet<RestaurantReservationTable> RestaurantReservationTables => Set<RestaurantReservationTable>();
    public DbSet<RestaurantReservationStatusHistory> RestaurantReservationStatusHistory => Set<RestaurantReservationStatusHistory>();
    public DbSet<RestaurantTableBlock> RestaurantTableBlocks => Set<RestaurantTableBlock>();
    public DbSet<RestaurantFloorPlan> RestaurantFloorPlans => Set<RestaurantFloorPlan>();
    public DbSet<RestaurantAreaLayout> RestaurantAreaLayouts => Set<RestaurantAreaLayout>();
    public DbSet<RestaurantTableLayout> RestaurantTableLayouts => Set<RestaurantTableLayout>();
    public DbSet<RestaurantTableSeatLayout> RestaurantTableSeatLayouts => Set<RestaurantTableSeatLayout>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new CoreBranchConfiguration());
        modelBuilder.ApplyConfiguration(new RestaurantFloorConfiguration());
        modelBuilder.ApplyConfiguration(new RestaurantAreaConfiguration());
        modelBuilder.ApplyConfiguration(new RestaurantTableConfiguration());
        modelBuilder.ApplyConfiguration(new RestaurantOpeningHourConfiguration());
        modelBuilder.ApplyConfiguration(new RestaurantSpecialDayConfiguration());
        modelBuilder.ApplyConfiguration(new RestaurantCustomerConfiguration());
        modelBuilder.ApplyConfiguration(new RestaurantReservationConfiguration());
        modelBuilder.ApplyConfiguration(new RestaurantReservationTableConfiguration());
        modelBuilder.ApplyConfiguration(new RestaurantReservationStatusHistoryConfiguration());
        modelBuilder.ApplyConfiguration(new RestaurantTableBlockConfiguration());
        modelBuilder.ApplyConfiguration(new RestaurantFloorPlanConfiguration());
        modelBuilder.ApplyConfiguration(new RestaurantAreaLayoutConfiguration());
        modelBuilder.ApplyConfiguration(new RestaurantTableLayoutConfiguration());
        modelBuilder.ApplyConfiguration(new RestaurantTableSeatLayoutConfiguration());

        modelBuilder.Entity<CoreBranch>().HasQueryFilter(entity => entity.CompanyId == CurrentCompanyId);
        modelBuilder.Entity<RestaurantFloor>().HasQueryFilter(entity => entity.CompanyId == CurrentCompanyId);
        modelBuilder.Entity<RestaurantArea>().HasQueryFilter(entity => entity.CompanyId == CurrentCompanyId);
        modelBuilder.Entity<RestaurantTable>().HasQueryFilter(entity => entity.CompanyId == CurrentCompanyId);
        modelBuilder.Entity<RestaurantOpeningHour>().HasQueryFilter(entity => entity.CompanyId == CurrentCompanyId);
        modelBuilder.Entity<RestaurantSpecialDay>().HasQueryFilter(entity => entity.CompanyId == CurrentCompanyId);
        modelBuilder.Entity<RestaurantCustomer>().HasQueryFilter(entity => entity.CompanyId == CurrentCompanyId);
        modelBuilder.Entity<RestaurantReservation>().HasQueryFilter(entity => entity.CompanyId == CurrentCompanyId);
        modelBuilder.Entity<RestaurantReservationTable>().HasQueryFilter(entity => entity.CompanyId == CurrentCompanyId);
        modelBuilder.Entity<RestaurantReservationStatusHistory>().HasQueryFilter(entity => entity.CompanyId == CurrentCompanyId);
        modelBuilder.Entity<RestaurantTableBlock>().HasQueryFilter(entity => entity.CompanyId == CurrentCompanyId);
        modelBuilder.Entity<RestaurantFloorPlan>().HasQueryFilter(entity => entity.CompanyId == CurrentCompanyId);
        modelBuilder.Entity<RestaurantAreaLayout>().HasQueryFilter(entity => entity.CompanyId == CurrentCompanyId);
        modelBuilder.Entity<RestaurantTableLayout>().HasQueryFilter(entity => entity.CompanyId == CurrentCompanyId);
        modelBuilder.Entity<RestaurantTableSeatLayout>().HasQueryFilter(entity => entity.CompanyId == CurrentCompanyId);
    }

    private static Guid ResolveCompanyId(ICompanyContextProvider companyContextProvider)
    {
        return companyContextProvider
            .GetCurrentAsync()
            .AsTask()
            .ConfigureAwait(false)
            .GetAwaiter()
            .GetResult()
            .CompanyId;
    }
}
