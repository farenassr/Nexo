using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nexo.Server.Modules.Core.Data.Entities;

namespace Nexo.Server.Modules.Core.Data.Configurations;

public sealed class CoreBranchConfiguration : IEntityTypeConfiguration<CoreBranch>
{
    public void Configure(EntityTypeBuilder<CoreBranch> builder)
    {
        builder.ToTable("branches", "core");

        builder.HasKey(branch => branch.Id);

        builder.Property(branch => branch.Id).HasColumnName("id");
        builder.Property(branch => branch.CompanyId).HasColumnName("company_id");
        builder.Property(branch => branch.Name).HasColumnName("name").HasMaxLength(160).IsRequired();
        builder.Property(branch => branch.Address).HasColumnName("address").HasMaxLength(400);
        builder.Property(branch => branch.TimeZone).HasColumnName("time_zone").HasMaxLength(100).IsRequired();
        builder.Property(branch => branch.IsActive).HasColumnName("is_active");
        builder.Property(branch => branch.CreatedAt).HasColumnName("created_at");
        builder.Property(branch => branch.UpdatedAt).HasColumnName("updated_at");

        builder.HasIndex(branch => new { branch.CompanyId, branch.IsActive });
        builder.HasIndex(branch => new { branch.CompanyId, branch.Name });
    }
}
