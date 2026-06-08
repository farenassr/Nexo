using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nexo.Server.Data;

namespace Nexo.Server.Modules.Restaurant.Data.Configurations;

internal static class RestaurantConfigurationExtensions
{
    public static void ConfigureCompanyOwnedEntity<TEntity>(
        this EntityTypeBuilder<TEntity> builder)
        where TEntity : class, ICompanyOwnedEntity
    {
        builder.Property(entity => entity.CompanyId).HasColumnName("company_id");
        builder.HasIndex(entity => entity.CompanyId);
    }

    public static void ConfigureAuditColumns<TEntity>(
        this EntityTypeBuilder<TEntity> builder)
        where TEntity : class
    {
        builder.Property<DateTimeOffset>("CreatedAt").HasColumnName("created_at");
        builder.Property<DateTimeOffset>("UpdatedAt").HasColumnName("updated_at");
    }
}
