using Nexo.Server.Modules.Shared.Auth;

namespace Nexo.Server.Modules.Core.OrganizationContext;

public sealed class AuthenticatedOrganizationContextProvider(
    IHttpContextAccessor httpContextAccessor) :
    IOrganizationContextProvider,
    IOptionalOrganizationContextProvider
{
    public async ValueTask<OrganizationContext> GetCurrentAsync(CancellationToken cancellationToken = default)
    {
        var context = await TryGetCurrentAsync(cancellationToken);
        if (context is not null)
        {
            return context;
        }

        var user = httpContextAccessor.HttpContext?.User;
        if (user?.Identity?.IsAuthenticated == true)
        {
            throw new InvalidOperationException("Authenticated session does not include a valid organization id.");
        }

        throw new InvalidOperationException("Organization context requires an authenticated session with a valid organization id.");
    }

    public ValueTask<OrganizationContext?> TryGetCurrentAsync(CancellationToken cancellationToken = default)
    {
        var user = httpContextAccessor.HttpContext?.User;
        if (user?.Identity?.IsAuthenticated != true)
        {
            return ValueTask.FromResult<OrganizationContext?>(null);
        }

        return KeycloakOrganizationClaimParser.TryGetOrganizationId(user, out var organizationId)
            ? ValueTask.FromResult<OrganizationContext?>(new OrganizationContext(organizationId))
            : ValueTask.FromResult<OrganizationContext?>(null);
    }
}
