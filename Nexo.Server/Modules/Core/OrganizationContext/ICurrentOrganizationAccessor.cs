namespace Nexo.Server.Modules.Core.OrganizationContext;

public interface ICurrentOrganizationAccessor
{
    Guid? OrganizationId { get; set; }

    Guid GetRequiredOrganizationId();
}
