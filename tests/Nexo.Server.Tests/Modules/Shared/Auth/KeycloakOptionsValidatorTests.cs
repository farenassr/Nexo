using Microsoft.Extensions.Options;
using Nexo.Server.Modules.Shared.Auth;
using TUnit.Assertions;
using TUnit.Core;

namespace Nexo.Server.Tests.Modules.Shared.Auth;

public sealed class KeycloakOptionsValidatorTests
{
    [Test]
    public async Task Validate_AcceptsPublicClientConfigurationWithoutClientSecret()
    {
        var options = new KeycloakOptions
        {
            Authority = "https://identity.example.test/realms/nexo",
            Realm = "nexo",
            ClientId = "nexo-web-bff",
            CallbackPath = "/auth/callback",
            LogoutRedirectUri = "https://app.example.test/login",
            Scopes = ["openid", "profile", "email", "organization"]
        };

        var result = new KeycloakOptionsValidator().Validate(Options.DefaultName, options);

        await Assert.That(result.Succeeded).IsTrue();
    }

    [Test]
    public async Task Validate_AcceptsSecureConfidentialClientConfiguration()
    {
        var options = new KeycloakOptions
        {
            Authority = "https://identity.example.test/realms/nexo",
            Realm = "nexo",
            ClientId = "nexo-web-bff",
            ClientSecret = "configured-outside-source-control",
            CallbackPath = "/auth/callback",
            LogoutRedirectUri = "https://app.example.test/login",
            Scopes = ["openid", "profile", "email", "organization", "offline_access"]
        };

        var result = new KeycloakOptionsValidator().Validate(Options.DefaultName, options);

        await Assert.That(result.Succeeded).IsTrue();
    }

    [Test]
    public async Task Validate_RejectsPlaceholderAuthority()
    {
        var options = new KeycloakOptions
        {
            Authority = "https://identity.example.invalid/realms/nexo",
            Realm = "nexo",
            ClientId = "nexo-web-bff",
            ClientSecret = "configured-outside-source-control",
            CallbackPath = "/auth/callback",
            LogoutRedirectUri = "https://app.example.test/login",
            Scopes = ["openid", "profile", "email"]
        };

        var result = new KeycloakOptionsValidator().Validate(Options.DefaultName, options);

        await Assert.That(result.Failed).IsTrue();
        await Assert.That(result.Failures).Contains("Keycloak:Authority must be configured for this environment.");
    }
}
