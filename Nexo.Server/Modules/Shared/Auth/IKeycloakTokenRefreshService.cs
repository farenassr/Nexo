using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;

namespace Nexo.Server.Modules.Shared.Auth;

public interface IKeycloakTokenRefreshService
{
    bool ShouldRefresh(AuthenticationProperties properties);

    Task<KeycloakTokenRefreshResult> RefreshAsync(
        ClaimsPrincipal principal,
        AuthenticationProperties properties,
        CancellationToken cancellationToken);
}
