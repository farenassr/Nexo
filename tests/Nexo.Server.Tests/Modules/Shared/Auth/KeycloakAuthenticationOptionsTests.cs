using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Nexo.Server.Modules.Shared.Auth;
using System.Text.Json;
using TUnit.Assertions;
using TUnit.Core;

namespace Nexo.Server.Tests.Modules.Shared.Auth;

public sealed class KeycloakAuthenticationOptionsTests
{
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

    [Test]
    public async Task AppSettings_StoresNonSecretKeycloakValuesAndOmitsClientCredentials()
    {
        var appSettingsPath = Path.Combine(FindRepositoryRoot(), "Nexo.Server", "appsettings.json");
        using var document = JsonDocument.Parse(File.ReadAllText(appSettingsPath));
        var keycloak = document.RootElement.GetProperty("Keycloak");

        await Assert.That(keycloak.GetProperty("Authority").GetString())
            .IsEqualTo("https://ceo-agent-keycloak.icybush-34e28ac8.westus2.azurecontainerapps.io/realms/ceo-agent");
        await Assert.That(keycloak.GetProperty("Realm").GetString()).IsEqualTo("ceo-agent");
        await Assert.That(keycloak.GetProperty("CallbackPath").GetString()).IsEqualTo("/auth/callback");
        await Assert.That(keycloak.GetProperty("LogoutRedirectUri").GetString()).IsEqualTo("http://localhost:5173/login");
        await Assert.That(keycloak.TryGetProperty("ClientId", out _)).IsFalse();
        await Assert.That(keycloak.TryGetProperty("ClientSecret", out _)).IsFalse();
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

    private static string FindRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "Nexo.slnx")))
        {
            directory = directory.Parent;
        }

        return directory?.FullName
               ?? throw new InvalidOperationException("Could not locate repository root.");
    }
}
