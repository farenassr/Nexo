namespace Nexo.Server.Modules.Core.OrganizationContext;

public interface IOptionalOrganizationContextProvider
{
    ValueTask<OrganizationContext?> TryGetCurrentAsync(CancellationToken cancellationToken = default);
}
