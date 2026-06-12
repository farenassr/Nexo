using Microsoft.Extensions.Options;
using Microsoft.OpenApi;
using Nexo.Server.Modules.Shared.Auth;
using Nexo.Server.OpenApi;
using TUnit.Assertions;
using TUnit.Core;

namespace Nexo.Server.Tests.Modules.Shared.Auth;

public sealed class KeycloakOpenApiSecurityTransformerTests
{
    [Test]
    public async Task TransformAsync_AddsBearerAndKeycloakSecuritySchemes()
    {
        var keycloakOptions = Options.Create(new KeycloakOptions
        {
            Authority = "https://ceo-agent-keycloak.example.test/realms/ceo-agent",
            Realm = "ceo-agent",
            ClientId = "ceo-agent-web",
            ClientSecret = "configured-outside-source-control",
            CallbackPath = "/auth/callback",
            LogoutRedirectUri = "https://app.example.test/login",
            Scopes = ["openid", "profile", "email", "organization"]
        });
        var document = new OpenApiDocument();
        var transformer = new KeycloakOpenApiSecurityTransformer(keycloakOptions);

        await transformer.TransformAsync(document, null!, CancellationToken.None);

        var schemes = document.Components?.SecuritySchemes;
        await Assert.That(schemes is not null).IsTrue();
        await Assert.That(schemes!.ContainsKey("Bearer")).IsTrue();
        await Assert.That(schemes.ContainsKey("Keycloak")).IsTrue();

        var bearer = schemes["Bearer"];
        await Assert.That(bearer.Type).IsEqualTo(SecuritySchemeType.Http);
        await Assert.That(bearer.Scheme).IsEqualTo("bearer");
        await Assert.That(bearer.BearerFormat).IsEqualTo("JWT");

        var keycloak = schemes["Keycloak"];
        var authorizationCode = keycloak.Flows?.AuthorizationCode;
        await Assert.That(keycloak.Type).IsEqualTo(SecuritySchemeType.OAuth2);
        await Assert.That(authorizationCode?.AuthorizationUrl?.AbsoluteUri)
            .IsEqualTo("https://ceo-agent-keycloak.example.test/realms/ceo-agent/protocol/openid-connect/auth");
        await Assert.That(authorizationCode?.TokenUrl?.AbsoluteUri)
            .IsEqualTo("https://ceo-agent-keycloak.example.test/realms/ceo-agent/protocol/openid-connect/token");
        await Assert.That(authorizationCode?.Scopes?.ContainsKey("organization")).IsTrue();

        await Assert.That(document.Security?.Count).IsEqualTo(2);
        await Assert.That(HasSecurityRequirement(document, "Bearer")).IsTrue();
        await Assert.That(HasSecurityRequirement(document, "Keycloak")).IsTrue();
    }

    private static bool HasSecurityRequirement(OpenApiDocument document, string schemeName)
    {
        return document.Security?.Any(requirement =>
            requirement.Keys.Any(reference => reference.Reference.Id == schemeName)) is true;
    }
}
