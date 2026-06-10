using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Nexo.Server.Modules.Shared.Auth;
using TUnit.Assertions;
using TUnit.Core;

namespace Nexo.Server.Tests.Modules.Shared.Auth;

public sealed class KeycloakAuthenticationOptionsTests
{
    [Test]
    public async Task AddKeycloakAuthentication_DisablesPushedAuthorizationRequests()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Keycloak:Authority"] = "https://identity.example.test/realms/nexo",
                ["Keycloak:Realm"] = "nexo",
                ["Keycloak:ClientId"] = "nexo-web-bff",
                ["Keycloak:ClientSecret"] = "configured-outside-source-control",
                ["Keycloak:CallbackPath"] = "/auth/callback",
                ["Keycloak:LogoutRedirectUri"] = "https://app.example.test/login",
                ["Keycloak:Scopes:0"] = "openid",
                ["Keycloak:Scopes:1"] = "profile",
                ["Keycloak:Scopes:2"] = "email"
            })
            .Build();
        var services = new ServiceCollection();

        services.AddKeycloakAuthentication(configuration);

        using var provider = services.BuildServiceProvider();
        var options = provider.GetRequiredService<IOptionsMonitor<OpenIdConnectOptions>>()
            .Get(NexoAuthSchemes.Keycloak);

        await Assert.That(options.PushedAuthorizationBehavior).IsEqualTo(PushedAuthorizationBehavior.Disable);
    }
}
