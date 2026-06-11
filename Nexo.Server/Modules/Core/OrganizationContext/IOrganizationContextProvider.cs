namespace Nexo.Server.Modules.Core.OrganizationContext;

public interface IOrganizationContextProvider
{
    ValueTask<OrganizationContext> GetCurrentAsync(CancellationToken cancellationToken = default);
}
