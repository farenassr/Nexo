using Microsoft.Extensions.Options;
using Nexo.Server.Modules.Shared.Auth;
using Scalar.AspNetCore;

namespace Nexo.Server.OpenApi;

public static class ScalarEndpointRouteBuilderExtensions
{
    public static IEndpointConventionBuilder MapNexoScalarApiReference(this IEndpointRouteBuilder endpoints)
    {
        return endpoints.MapScalarApiReference((options, context) =>
        {
            var keycloakOptions = context.RequestServices.GetRequiredService<IOptions<KeycloakOptions>>().Value;
            ConfigureAuthentication(options, keycloakOptions);
        });
    }

    private static void ConfigureAuthentication(ScalarOptions options, KeycloakOptions keycloakOptions)
    {
        var authority = keycloakOptions.Authority.TrimEnd('/');
        options.Layout = ScalarLayout.Modern;
        options.ShowSidebar = true;
        options.DefaultOpenAllTags = false;

        options
            .WithTitle("Nexo API Reference")
            .WithTheme(ScalarTheme.Default)
            .ForceLightMode()
            .HideDarkModeToggle()
            .WithOperationTitleSource(OperationTitleSource.Summary)
            .WithDefaultHttpClient(ScalarTarget.CSharp, ScalarClient.HttpClient)
            .AddPreferredSecuritySchemes(
                [KeycloakOpenApiSecurityTransformer.BearerSchemeName, KeycloakOpenApiSecurityTransformer.KeycloakSchemeName])
            .AddHttpAuthentication(KeycloakOpenApiSecurityTransformer.BearerSchemeName, _ => { })
            .AddAuthorizationCodeFlow(KeycloakOpenApiSecurityTransformer.KeycloakSchemeName, flow =>
            {
                flow.ClientId = keycloakOptions.ClientId;
                flow.AuthorizationUrl = $"{authority}/protocol/openid-connect/auth";
                flow.TokenUrl = $"{authority}/protocol/openid-connect/token";
                flow.Pkce = Pkce.Sha256;
                flow.SelectedScopes = keycloakOptions.Scopes;
            });
    }
}
