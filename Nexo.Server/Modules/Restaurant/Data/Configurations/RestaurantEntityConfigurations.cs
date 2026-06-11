using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nexo.Server.Modules.Core.Data.Entities;
using Nexo.Server.Modules.Restaurant.Data.Entities.Restaurant;

namespace Nexo.Server.Modules.Restaurant.Data.Configurations;

public sealed class RestaurantFloorConfiguration : IEntityTypeConfiguration<RestaurantFloor>
{
    public void Configure(EntityTypeBuilder<RestaurantFloor> builder)
    {
        builder.ToTable("floors", "restaurant");
        builder.HasKey(floor => floor.Id);
        builder.ConfigureOrganizationOwnedEntity();
        builder.ConfigureAuditColumns();

        builder.Property(floor => floor.Id).HasColumnName("id");
        builder.Property(floor => floor.BranchId).HasColumnName("branch_id");
        builder.Property(floor => floor.Name).HasColumnName("name").HasMaxLength(160).IsRequired();
        builder.Property(floor => floor.SortOrder).HasColumnName("sort_order");
        builder.Property(floor => floor.IsActive).HasColumnName("is_active");

        builder.HasOne<CoreBranch>()
            .WithMany()
            .HasForeignKey(floor => floor.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(floor => new { floor.OrganizationId, floor.BranchId });
        builder.HasIndex(floor => new { floor.OrganizationId, floor.BranchId, floor.Name });
    }
}

public sealed class RestaurantAreaConfiguration : IEntityTypeConfiguration<RestaurantArea>
{
    public void Configure(EntityTypeBuilder<RestaurantArea> builder)
    {
        builder.ToTable("areas", "restaurant");
        builder.HasKey(area => area.Id);
        builder.ConfigureOrganizationOwnedEntity();
        builder.ConfigureAuditColumns();

        builder.Property(area => area.Id).HasColumnName("id");
        builder.Property(area => area.BranchId).HasColumnName("branch_id");
        builder.Property(area => area.FloorId).HasColumnName("floor_id");
        builder.Property(area => area.Name).HasColumnName("name").HasMaxLength(160).IsRequired();
        builder.Property(area => area.Type).HasColumnName("type").HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(area => area.SortOrder).HasColumnName("sort_order");
        builder.Property(area => area.IsActive).HasColumnName("is_active");

        builder.HasOne(area => area.Floor)
            .WithMany(floor => floor.Areas)
            .HasForeignKey(area => area.FloorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<CoreBranch>()
            .WithMany()
            .HasForeignKey(area => area.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(area => new { area.OrganizationId, area.BranchId, area.FloorId });
    }
}

public sealed class RestaurantTableConfiguration : IEntityTypeConfiguration<RestaurantTable>
{
    public void Configure(EntityTypeBuilder<RestaurantTable> builder)
    {
        builder.ToTable("tables", "restaurant");
        builder.HasKey(table => table.Id);
        builder.ConfigureOrganizationOwnedEntity();
        builder.ConfigureAuditColumns();

        builder.Property(table => table.Id).HasColumnName("id");
        builder.Property(table => table.BranchId).HasColumnName("branch_id");
        builder.Property(table => table.FloorId).HasColumnName("floor_id");
        builder.Property(table => table.AreaId).HasColumnName("area_id");
        builder.Property(table => table.Label).HasColumnName("label").HasMaxLength(80).IsRequired();
        builder.Property(table => table.MinCapacity).HasColumnName("min_capacity");
        builder.Property(table => table.MaxCapacity).HasColumnName("max_capacity");
        builder.Property(table => table.DefaultReservationMinutes).HasColumnName("default_reservation_minutes");
        builder.Property(table => table.Shape).HasColumnName("shape").HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(table => table.IsActive).HasColumnName("is_active");

        builder.HasOne(table => table.Floor)
            .WithMany(floor => floor.Tables)
            .HasForeignKey(table => table.FloorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(table => table.Area)
            .WithMany(area => area.Tables)
            .HasForeignKey(table => table.AreaId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne<CoreBranch>()
            .WithMany()
            .HasForeignKey(table => table.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(table => new { table.OrganizationId, table.BranchId, table.FloorId });
        builder.HasIndex(table => new { table.OrganizationId, table.BranchId, table.IsActive });
        builder.HasIndex(table => new { table.OrganizationId, table.BranchId, table.Label });
    }
}

public sealed class RestaurantOpeningHourConfiguration : IEntityTypeConfiguration<RestaurantOpeningHour>
{
    public void Configure(EntityTypeBuilder<RestaurantOpeningHour> builder)
    {
        builder.ToTable("opening_hours", "restaurant");
        builder.HasKey(openingHour => openingHour.Id);
        builder.ConfigureOrganizationOwnedEntity();
        builder.ConfigureAuditColumns();

        builder.Property(openingHour => openingHour.Id).HasColumnName("id");
        builder.Property(openingHour => openingHour.BranchId).HasColumnName("branch_id");
        builder.Property(openingHour => openingHour.DayOfWeek).HasColumnName("day_of_week").HasConversion<int>();
        builder.Property(openingHour => openingHour.OpensAt).HasColumnName("opens_at");
        builder.Property(openingHour => openingHour.ClosesAt).HasColumnName("closes_at");
        builder.Property(openingHour => openingHour.IsClosed).HasColumnName("is_closed");

        builder.HasOne<CoreBranch>()
            .WithMany()
            .HasForeignKey(openingHour => openingHour.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(openingHour => new { openingHour.OrganizationId, openingHour.BranchId, openingHour.DayOfWeek });
    }
}

public sealed class RestaurantSpecialDayConfiguration : IEntityTypeConfiguration<RestaurantSpecialDay>
{
    public void Configure(EntityTypeBuilder<RestaurantSpecialDay> builder)
    {
        builder.ToTable("special_days", "restaurant");
        builder.HasKey(specialDay => specialDay.Id);
        builder.ConfigureOrganizationOwnedEntity();
        builder.ConfigureAuditColumns();

        builder.Property(specialDay => specialDay.Id).HasColumnName("id");
        builder.Property(specialDay => specialDay.BranchId).HasColumnName("branch_id");
        builder.Property(specialDay => specialDay.Date).HasColumnName("date");
        builder.Property(specialDay => specialDay.Name).HasColumnName("name").HasMaxLength(160).IsRequired();
        builder.Property(specialDay => specialDay.IsClosed).HasColumnName("is_closed");
        builder.Property(specialDay => specialDay.OpensAt).HasColumnName("opens_at");
        builder.Property(specialDay => specialDay.ClosesAt).HasColumnName("closes_at");

        builder.HasOne<CoreBranch>()
            .WithMany()
            .HasForeignKey(specialDay => specialDay.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(specialDay => new { specialDay.OrganizationId, specialDay.BranchId, specialDay.Date }).IsUnique();
    }
}

public sealed class RestaurantCustomerConfiguration : IEntityTypeConfiguration<RestaurantCustomer>
{
    public void Configure(EntityTypeBuilder<RestaurantCustomer> builder)
    {
        builder.ToTable("customers", "restaurant");
        builder.HasKey(customer => customer.Id);
        builder.ConfigureOrganizationOwnedEntity();
        builder.ConfigureAuditColumns();

        builder.Property(customer => customer.Id).HasColumnName("id");
        builder.Property(customer => customer.FullName).HasColumnName("full_name").HasMaxLength(200).IsRequired();
        builder.Property(customer => customer.Phone).HasColumnName("phone").HasMaxLength(64);
        builder.Property(customer => customer.Email).HasColumnName("email").HasMaxLength(320);
        builder.Property(customer => customer.Notes).HasColumnName("notes").HasMaxLength(2000);

        builder.HasIndex(customer => new { customer.OrganizationId, customer.Phone });
        builder.HasIndex(customer => new { customer.OrganizationId, customer.Email });
    }
}

public sealed class RestaurantReservationConfiguration : IEntityTypeConfiguration<RestaurantReservation>
{
    public void Configure(EntityTypeBuilder<RestaurantReservation> builder)
    {
        builder.ToTable("reservations", "restaurant");
        builder.HasKey(reservation => reservation.Id);
        builder.ConfigureOrganizationOwnedEntity();
        builder.ConfigureAuditColumns();

        builder.Property(reservation => reservation.Id).HasColumnName("id");
        builder.Property(reservation => reservation.BranchId).HasColumnName("branch_id");
        builder.Property(reservation => reservation.CustomerId).HasColumnName("customer_id");
        builder.Property(reservation => reservation.PartySize).HasColumnName("party_size");
        builder.Property(reservation => reservation.StartAt).HasColumnName("start_at");
        builder.Property(reservation => reservation.EndAt).HasColumnName("end_at");
        builder.Property(reservation => reservation.TurnoverBufferMinutes).HasColumnName("turnover_buffer_minutes");
        builder.Property(reservation => reservation.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(reservation => reservation.Source).HasColumnName("source").HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(reservation => reservation.SpecialRequests).HasColumnName("special_requests").HasMaxLength(2000);
        builder.Property(reservation => reservation.CreatedByAppUserId).HasColumnName("created_by_app_user_id");
        builder.Property(reservation => reservation.CancelledAt).HasColumnName("cancelled_at");
        builder.Property(reservation => reservation.CancellationReason).HasColumnName("cancellation_reason").HasMaxLength(1000);

        builder.HasOne(reservation => reservation.Customer)
            .WithMany(customer => customer.Reservations)
            .HasForeignKey(reservation => reservation.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<CoreBranch>()
            .WithMany()
            .HasForeignKey(reservation => reservation.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(reservation => new { reservation.OrganizationId, reservation.BranchId, reservation.StartAt });
        builder.HasIndex(reservation => new { reservation.OrganizationId, reservation.BranchId, reservation.Status, reservation.StartAt });
    }
}

public sealed class RestaurantReservationTableConfiguration : IEntityTypeConfiguration<RestaurantReservationTable>
{
    public void Configure(EntityTypeBuilder<RestaurantReservationTable> builder)
    {
        builder.ToTable("reservation_tables", "restaurant");
        builder.HasKey(reservationTable => new { reservationTable.ReservationId, reservationTable.TableId });
        builder.ConfigureOrganizationOwnedEntity();

        builder.Property(reservationTable => reservationTable.ReservationId).HasColumnName("reservation_id");
        builder.Property(reservationTable => reservationTable.TableId).HasColumnName("table_id");
        builder.Property(reservationTable => reservationTable.CreatedAt).HasColumnName("created_at");

        builder.HasOne(reservationTable => reservationTable.Reservation)
            .WithMany(reservation => reservation.ReservationTables)
            .HasForeignKey(reservationTable => reservationTable.ReservationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(reservationTable => reservationTable.Table)
            .WithMany(table => table.ReservationTables)
            .HasForeignKey(reservationTable => reservationTable.TableId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(reservationTable => new { reservationTable.OrganizationId, reservationTable.TableId });
    }
}

public sealed class RestaurantReservationStatusHistoryConfiguration : IEntityTypeConfiguration<RestaurantReservationStatusHistory>
{
    public void Configure(EntityTypeBuilder<RestaurantReservationStatusHistory> builder)
    {
        builder.ToTable("reservation_status_history", "restaurant");
        builder.HasKey(history => history.Id);
        builder.ConfigureOrganizationOwnedEntity();

        builder.Property(history => history.Id).HasColumnName("id");
        builder.Property(history => history.ReservationId).HasColumnName("reservation_id");
        builder.Property(history => history.FromStatus).HasColumnName("from_status").HasConversion<string>().HasMaxLength(32);
        builder.Property(history => history.ToStatus).HasColumnName("to_status").HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(history => history.Reason).HasColumnName("reason").HasMaxLength(1000);
        builder.Property(history => history.ChangedByAppUserId).HasColumnName("changed_by_app_user_id");
        builder.Property(history => history.ChangedAt).HasColumnName("changed_at");

        builder.HasOne(history => history.Reservation)
            .WithMany(reservation => reservation.StatusHistory)
            .HasForeignKey(history => history.ReservationId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(history => new { history.OrganizationId, history.ReservationId, history.ChangedAt });
    }
}

public sealed class RestaurantTableBlockConfiguration : IEntityTypeConfiguration<RestaurantTableBlock>
{
    public void Configure(EntityTypeBuilder<RestaurantTableBlock> builder)
    {
        builder.ToTable("table_blocks", "restaurant");
        builder.HasKey(block => block.Id);
        builder.ConfigureOrganizationOwnedEntity();
        builder.ConfigureAuditColumns();

        builder.Property(block => block.Id).HasColumnName("id");
        builder.Property(block => block.BranchId).HasColumnName("branch_id");
        builder.Property(block => block.FloorId).HasColumnName("floor_id");
        builder.Property(block => block.AreaId).HasColumnName("area_id");
        builder.Property(block => block.TableId).HasColumnName("table_id");
        builder.Property(block => block.StartAt).HasColumnName("start_at");
        builder.Property(block => block.EndAt).HasColumnName("end_at");
        builder.Property(block => block.Reason).HasColumnName("reason").HasMaxLength(1000);
        builder.Property(block => block.IsActive).HasColumnName("is_active");

        builder.HasOne<CoreBranch>()
            .WithMany()
            .HasForeignKey(block => block.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<RestaurantFloor>()
            .WithMany()
            .HasForeignKey(block => block.FloorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<RestaurantArea>()
            .WithMany()
            .HasForeignKey(block => block.AreaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<RestaurantTable>()
            .WithMany()
            .HasForeignKey(block => block.TableId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(block => new { block.OrganizationId, block.BranchId, block.StartAt, block.EndAt });
        builder.HasIndex(block => new { block.OrganizationId, block.TableId, block.StartAt, block.EndAt });
    }
}

public sealed class RestaurantFloorPlanConfiguration : IEntityTypeConfiguration<RestaurantFloorPlan>
{
    public void Configure(EntityTypeBuilder<RestaurantFloorPlan> builder)
    {
        builder.ToTable("floor_plans", "restaurant");
        builder.HasKey(floorPlan => floorPlan.Id);
        builder.ConfigureOrganizationOwnedEntity();
        builder.ConfigureAuditColumns();

        builder.Property(floorPlan => floorPlan.Id).HasColumnName("id");
        builder.Property(floorPlan => floorPlan.BranchId).HasColumnName("branch_id");
        builder.Property(floorPlan => floorPlan.FloorId).HasColumnName("floor_id");
        builder.Property(floorPlan => floorPlan.Name).HasColumnName("name").HasMaxLength(160).IsRequired();
        builder.Property(floorPlan => floorPlan.CanvasWidth).HasColumnName("canvas_width");
        builder.Property(floorPlan => floorPlan.CanvasHeight).HasColumnName("canvas_height");
        builder.Property(floorPlan => floorPlan.GridSize).HasColumnName("grid_size");
        builder.Property(floorPlan => floorPlan.IsActive).HasColumnName("is_active");

        builder.HasOne(floorPlan => floorPlan.Floor)
            .WithMany()
            .HasForeignKey(floorPlan => floorPlan.FloorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<CoreBranch>()
            .WithMany()
            .HasForeignKey(floorPlan => floorPlan.BranchId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(floorPlan => new { floorPlan.OrganizationId, floorPlan.BranchId, floorPlan.FloorId, floorPlan.IsActive });
    }
}

public sealed class RestaurantAreaLayoutConfiguration : IEntityTypeConfiguration<RestaurantAreaLayout>
{
    public void Configure(EntityTypeBuilder<RestaurantAreaLayout> builder)
    {
        builder.ToTable("area_layouts", "restaurant");
        builder.HasKey(areaLayout => areaLayout.Id);
        builder.ConfigureOrganizationOwnedEntity();
        builder.ConfigureAuditColumns();

        builder.Property(areaLayout => areaLayout.Id).HasColumnName("id");
        builder.Property(areaLayout => areaLayout.FloorPlanId).HasColumnName("floor_plan_id");
        builder.Property(areaLayout => areaLayout.AreaId).HasColumnName("area_id");
        builder.Property(areaLayout => areaLayout.X).HasColumnName("x");
        builder.Property(areaLayout => areaLayout.Y).HasColumnName("y");
        builder.Property(areaLayout => areaLayout.Width).HasColumnName("width");
        builder.Property(areaLayout => areaLayout.Height).HasColumnName("height");
        builder.Property(areaLayout => areaLayout.RotationDegrees).HasColumnName("rotation_degrees");
        builder.Property(areaLayout => areaLayout.ZIndex).HasColumnName("z_index");

        builder.HasOne(areaLayout => areaLayout.FloorPlan)
            .WithMany(floorPlan => floorPlan.AreaLayouts)
            .HasForeignKey(areaLayout => areaLayout.FloorPlanId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(areaLayout => areaLayout.Area)
            .WithMany()
            .HasForeignKey(areaLayout => areaLayout.AreaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(areaLayout => new { areaLayout.OrganizationId, areaLayout.FloorPlanId });
    }
}

public sealed class RestaurantTableLayoutConfiguration : IEntityTypeConfiguration<RestaurantTableLayout>
{
    public void Configure(EntityTypeBuilder<RestaurantTableLayout> builder)
    {
        builder.ToTable("table_layouts", "restaurant");
        builder.HasKey(tableLayout => tableLayout.Id);
        builder.ConfigureOrganizationOwnedEntity();
        builder.ConfigureAuditColumns();

        builder.Property(tableLayout => tableLayout.Id).HasColumnName("id");
        builder.Property(tableLayout => tableLayout.FloorPlanId).HasColumnName("floor_plan_id");
        builder.Property(tableLayout => tableLayout.TableId).HasColumnName("table_id");
        builder.Property(tableLayout => tableLayout.X).HasColumnName("x");
        builder.Property(tableLayout => tableLayout.Y).HasColumnName("y");
        builder.Property(tableLayout => tableLayout.Width).HasColumnName("width");
        builder.Property(tableLayout => tableLayout.Height).HasColumnName("height");
        builder.Property(tableLayout => tableLayout.RotationDegrees).HasColumnName("rotation_degrees");
        builder.Property(tableLayout => tableLayout.Shape).HasColumnName("shape").HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(tableLayout => tableLayout.ZIndex).HasColumnName("z_index");

        builder.HasOne(tableLayout => tableLayout.FloorPlan)
            .WithMany(floorPlan => floorPlan.TableLayouts)
            .HasForeignKey(tableLayout => tableLayout.FloorPlanId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(tableLayout => tableLayout.Table)
            .WithMany()
            .HasForeignKey(tableLayout => tableLayout.TableId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(tableLayout => new { tableLayout.OrganizationId, tableLayout.FloorPlanId, tableLayout.TableId }).IsUnique();
    }
}

public sealed class RestaurantTableSeatLayoutConfiguration : IEntityTypeConfiguration<RestaurantTableSeatLayout>
{
    public void Configure(EntityTypeBuilder<RestaurantTableSeatLayout> builder)
    {
        builder.ToTable("table_seat_layouts", "restaurant");
        builder.HasKey(seatLayout => seatLayout.Id);
        builder.ConfigureOrganizationOwnedEntity();
        builder.ConfigureAuditColumns();

        builder.Property(seatLayout => seatLayout.Id).HasColumnName("id");
        builder.Property(seatLayout => seatLayout.TableLayoutId).HasColumnName("table_layout_id");
        builder.Property(seatLayout => seatLayout.SeatNumber).HasColumnName("seat_number");
        builder.Property(seatLayout => seatLayout.X).HasColumnName("x");
        builder.Property(seatLayout => seatLayout.Y).HasColumnName("y");
        builder.Property(seatLayout => seatLayout.RotationDegrees).HasColumnName("rotation_degrees");

        builder.HasOne(seatLayout => seatLayout.TableLayout)
            .WithMany(tableLayout => tableLayout.SeatLayouts)
            .HasForeignKey(seatLayout => seatLayout.TableLayoutId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(seatLayout => new { seatLayout.OrganizationId, seatLayout.TableLayoutId, seatLayout.SeatNumber });
    }
}
