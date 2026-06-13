using FastEndpoints;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Nexo.Server.Modules.Shared.Auth.Features;

public sealed class LogoutEndpoint(IOptions<KeycloakOptions> options) : EndpointWithoutRequest<object>
{
    public override void Configure()
    {
        Post("/auth/logout");
        Description(description => description.WithTags("🔐 Authentication"));
        Summary(summary =>
        {
            summary.Summary = "Sign Out";
            summary.Description = "Clears the local BFF session and optionally returns a Keycloak federated logout URL.";
        });
    }

    public override async Task HandleAsync(CancellationToken cancellationToken)
    {
        var federated = Query<bool>("federated", isRequired: false);
        var idToken = await HttpContext.GetTokenAsync(NexoAuthSchemes.Session, "id_token");

        await HttpContext.SignOutAsync(NexoAuthSchemes.Session);

        if (!federated)
        {
            await Send.NoContentAsync(cancellationToken);
            return;
        }

        var logoutUrl = BuildLogoutUrl(idToken);
        await Send.OkAsync(new { logoutUrl }, cancellationToken);
    }

    private string BuildLogoutUrl(string? idToken)
    {
        var keycloakOptions = options.Value;
        var query = new QueryString()
            .Add("client_id", keycloakOptions.ClientId)
            .Add("post_logout_redirect_uri", keycloakOptions.LogoutRedirectUri);

        if (!string.IsNullOrWhiteSpace(idToken))
        {
            query = query.Add("id_token_hint", idToken);
        }

        return keycloakOptions.EndSessionEndpoint + query;
    }
}
