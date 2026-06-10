using System.Security.Claims;
using FastEndpoints;
using Nexo.Shared.Auth;

namespace Nexo.Server.Modules.Shared.Auth.Features;

public sealed class AuthMeEndpoint : EndpointWithoutRequest<AuthSessionResponse>
{
    private static readonly string[] CompanyClaimTypes =
    [
        "company_id",
        "organization",
        "org_id",
        "tenant_id"
    ];

    public override void Configure()
    {
        Get("/auth/me");
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

    internal static AuthSessionResponse BuildResponse(ClaimsPrincipal user)
    {
        var claims = user.Claims
            .Select(claim => new AuthClaimResponse(claim.Type, claim.Value))
            .OrderBy(claim => claim.Type, StringComparer.Ordinal)
            .ThenBy(claim => claim.Value, StringComparer.Ordinal)
            .ToArray();

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
            CompanyClaimTypes
                .Select(user.FindFirstValue)
                .FirstOrDefault(value => !string.IsNullOrWhiteSpace(value)),
            roles,
            claims);
    }
}
