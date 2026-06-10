using Microsoft.AspNetCore.Authentication;
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
    public async Task AddKeycloakAuthentication_UsesDevelopmentSchemeWhenEnabled()
    {
        var configuration = CreateConfiguration(new Dictionary<string, string?>
        {
            ["Nexo:DevelopmentAuthentication:Enabled"] = "true"
        });
        var services = new ServiceCollection();

        services.AddKeycloakAuthentication(configuration);

        using var provider = services.BuildServiceProvider();
        var options = provider.GetRequiredService<IOptions<AuthenticationOptions>>().Value;

        await Assert.That(options.DefaultAuthenticateScheme).IsEqualTo(NexoAuthSchemes.Development);
        await Assert.That(options.DefaultChallengeScheme).IsEqualTo(NexoAuthSchemes.Development);
        await Assert.That(options.DefaultSignInScheme).IsEqualTo(NexoAuthSchemes.Session);
    }

    [Test]
    public async Task AddKeycloakAuthentication_UsesSessionAndKeycloakSchemesByDefault()
    {
        var configuration = CreateConfiguration();
        var services = new ServiceCollection();

        services.AddKeycloakAuthentication(configuration);

        using var provider = services.BuildServiceProvider();
        var options = provider.GetRequiredService<IOptions<AuthenticationOptions>>().Value;

        await Assert.That(options.DefaultAuthenticateScheme).IsEqualTo(NexoAuthSchemes.Session);
        await Assert.That(options.DefaultChallengeScheme).IsEqualTo(NexoAuthSchemes.Keycloak);
        await Assert.That(options.DefaultSignInScheme).IsEqualTo(NexoAuthSchemes.Session);
    }

    [Test]
    public async Task AddKeycloakAuthentication_DisablesPushedAuthorizationRequests()
    {
        var configuration = CreateConfiguration();
        var services = new ServiceCollection();

        services.AddKeycloakAuthentication(configuration);

        using var provider = services.BuildServiceProvider();
        var options = provider.GetRequiredService<IOptionsMonitor<OpenIdConnectOptions>>()
            .Get(NexoAuthSchemes.Keycloak);

        await Assert.That(options.PushedAuthorizationBehavior).IsEqualTo(PushedAuthorizationBehavior.Disable);
    }

    private static IConfiguration CreateConfiguration(Dictionary<string, string?>? overrides = null)
    {
        var values = new Dictionary<string, string?>
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
        };

        if (overrides is not null)
        {
            foreach (var (key, value) in overrides)
            {
                values[key] = value;
            }
        }

        return new ConfigurationBuilder()
            .AddInMemoryCollection(values)
            .Build();
    }
}
