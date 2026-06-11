namespace Nexo.Server.Data;

public interface IOrganizationOwnedEntity
{
    Guid OrganizationId { get; set; }
}
