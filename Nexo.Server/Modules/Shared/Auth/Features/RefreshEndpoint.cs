using FastEndpoints;
using Microsoft.AspNetCore.Authentication;

namespace Nexo.Server.Modules.Shared.Auth.Features;

public sealed class RefreshEndpoint(IKeycloakTokenRefreshService refreshService) : EndpointWithoutRequest
{
    public override void Configure()
    {
        Post("/auth/refresh");
        Description(description => description.WithTags("🔐 Authentication"));
        Summary(summary =>
        {
            summary.Summary = "Refresh Session Tokens";
            summary.Description = "Refreshes the server-side Keycloak tokens stored in the BFF session cookie.";
        });
    }

    public override async Task HandleAsync(CancellationToken cancellationToken)
    {
        var authResult = await HttpContext.AuthenticateAsync(NexoAuthSchemes.Session);
        if (!authResult.Succeeded || authResult.Principal is null)
        {
            await Send.UnauthorizedAsync(cancellationToken);
            return;
        }

        var result = await refreshService.RefreshAsync(
            authResult.Principal,
            authResult.Properties ?? new AuthenticationProperties(),
            cancellationToken);
        if (!result.Succeeded)
        {
            await HttpContext.SignOutAsync(NexoAuthSchemes.Session);
            await Send.UnauthorizedAsync(cancellationToken);
            return;
        }

        await HttpContext.SignInAsync(
            NexoAuthSchemes.Session,
            authResult.Principal,
            authResult.Properties);
        await Send.NoContentAsync(cancellationToken);
    }
}
