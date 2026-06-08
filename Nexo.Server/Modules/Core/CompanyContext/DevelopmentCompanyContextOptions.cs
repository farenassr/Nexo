namespace Nexo.Server.Modules.Core.CompanyContext;

public sealed class DevelopmentCompanyContextOptions
{
    public const string SectionName = "Nexo:DevelopmentCompanyContext";

    public Guid CompanyId { get; set; } = Guid.Parse("00000000-0000-7000-8000-000000000001");
}
