namespace Nexo.Server.Modules.Core.OrganizationContext;

public sealed class CurrentOrganizationAccessor : ICurrentOrganizationAccessor
{
    public Guid? OrganizationId { get; set; }

    public Guid GetRequiredOrganizationId()
    {
        return OrganizationId
               ?? throw new InvalidOperationException("No organization context was available.");
    }
}
