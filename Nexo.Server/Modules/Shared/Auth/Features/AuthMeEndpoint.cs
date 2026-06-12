using System.Security.Claims;
using FastEndpoints;
using Nexo.Shared.Auth;

namespace Nexo.Server.Modules.Shared.Auth.Features;

public sealed class AuthMeEndpoint : EndpointWithoutRequest<AuthSessionResponse>
{
    public override void Configure()
    {
        Get("/auth/me");
        AllowAnonymous();
        Summary(summary => summary.Summary = "Returns the current BFF cookie session.");
    }

    public override async Task HandleAsync(CancellationToken cancellationToken)
    {
        var user = HttpContext.User;
        if (user.Identity?.IsAuthenticated != true)
        {
            await Send.UnauthorizedAsync(cancellationToken);
            return;
        }

        await Send.OkAsync(BuildResponse(user), cancellationToken);
    }

    public static AuthSessionResponse BuildResponse(ClaimsPrincipal user)
    {
        var roles = user.Claims
            .Where(claim => claim.Type is ClaimTypes.Role or "role" or "roles")
            .Select(claim => claim.Value)
            .Distinct(StringComparer.Ordinal)
            .Order(StringComparer.Ordinal)
            .ToArray();

        return new AuthSessionResponse(
            true,
            user.FindFirstValue("sub") ?? user.FindFirstValue(ClaimTypes.NameIdentifier),
            user.Identity?.Name ?? user.FindFirstValue("preferred_username"),
            user.FindFirstValue("email"),
            KeycloakOrganizationClaimParser.TryGetOrganizationId(user, out var organizationId)
                ? organizationId.ToString()
                : null,
            roles);
    }
}
