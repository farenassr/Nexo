using Microsoft.AspNetCore.OpenApi;
using Microsoft.Extensions.Options;
using Microsoft.OpenApi;
using Nexo.Server.Modules.Shared.Auth;

namespace Nexo.Server.OpenApi;

public sealed class KeycloakOpenApiSecurityTransformer(IOptions<KeycloakOptions> options) : IOpenApiDocumentTransformer
{
    public const string BearerSchemeName = "Bearer";
    public const string KeycloakSchemeName = "Keycloak";

    private readonly KeycloakOptions keycloakOptions = options.Value;

    public Task TransformAsync(
        OpenApiDocument document,
        OpenApiDocumentTransformerContext context,
        CancellationToken cancellationToken)
    {
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>(StringComparer.Ordinal);
        document.Components.SecuritySchemes[BearerSchemeName] = CreateBearerScheme();
        document.Components.SecuritySchemes[KeycloakSchemeName] = CreateKeycloakScheme();

        document.Security ??= [];
        AddSecurityRequirement(document, BearerSchemeName);
        AddSecurityRequirement(document, KeycloakSchemeName, GetOAuthScopes().Keys);

        return Task.CompletedTask;
    }

    private static OpenApiSecurityScheme CreateBearerScheme()
    {
        return new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "Paste a Keycloak access token. Scalar sends it as Authorization: Bearer <token>."
        };
    }

    private OpenApiSecurityScheme CreateKeycloakScheme()
    {
        var authority = keycloakOptions.Authority.TrimEnd('/');

        return new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.OAuth2,
            Description = "Login with Keycloak from Scalar using authorization code with PKCE.",
            Flows = new OpenApiOAuthFlows
            {
                AuthorizationCode = new OpenApiOAuthFlow
                {
                    AuthorizationUrl = new Uri($"{authority}/protocol/openid-connect/auth"),
                    TokenUrl = new Uri($"{authority}/protocol/openid-connect/token"),
                    Scopes = GetOAuthScopes()
                }
            }
        };
    }

    private Dictionary<string, string> GetOAuthScopes()
    {
        return keycloakOptions.Scopes
            .Distinct(StringComparer.Ordinal)
            .ToDictionary(scope => scope, GetScopeDescription, StringComparer.Ordinal);
    }

    private static string GetScopeDescription(string scope)
    {
        return scope switch
        {
            "openid" => "OpenID Connect sign-in.",
            "profile" => "User profile claims.",
            "email" => "User email claims.",
            "organization" => "Keycloak organization claims used for Nexo tenancy.",
            _ => scope
        };
    }

    private static void AddSecurityRequirement(
        OpenApiDocument document,
        string schemeName,
        IEnumerable<string>? scopes = null)
    {
        if (document.Security?.Any(requirement =>
                requirement.Keys.Any(reference => reference.Reference.Id == schemeName)) is true)
        {
            return;
        }

        document.Security!.Add(new OpenApiSecurityRequirement
        {
            [new OpenApiSecuritySchemeReference(schemeName, document)] = scopes?.ToList() ?? []
        });
    }
}
