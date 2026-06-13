using FastEndpoints;
using Microsoft.AspNetCore.Authentication;

namespace Nexo.Server.Modules.Shared.Auth.Features;

public sealed class LoginEndpoint : EndpointWithoutRequest
{
    public override void Configure()
    {
        Get("/auth/login");
        AllowAnonymous();
        DontAutoSendResponse();
        Description(description => description.WithTags("🔐 Authentication"));
        Summary(summary =>
        {
            summary.Summary = "Start Keycloak Login";
            summary.Description = "Starts the Keycloak authorization-code flow and redirects back to the requested local return URL.";
        });
    }

    public override async Task HandleAsync(CancellationToken cancellationToken)
    {
        var returnUrl = Query<string>("returnUrl", isRequired: false);
        var properties = new AuthenticationProperties
        {
            RedirectUri = IsLocalReturnUrl(returnUrl) ? returnUrl : "/"
        };

        await HttpContext.ChallengeAsync(NexoAuthSchemes.Keycloak, properties);
    }

    private static bool IsLocalReturnUrl(string? returnUrl)
    {
        return !string.IsNullOrWhiteSpace(returnUrl)
               && returnUrl.StartsWith('/')
               && !returnUrl.StartsWith("//", StringComparison.Ordinal);
    }
}
