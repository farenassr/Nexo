using System.Text.Json;
using TUnit.Assertions;
using TUnit.Core;

namespace Nexo.Server.Tests.Harness;

public sealed class AspireAppHostResourceUrlTests
{
    [Test]
    public async Task ServerResource_DeepLinksToScalarInAspireDashboard()
    {
        var repoRoot = FindRepositoryRoot();
        var appHost = await File.ReadAllTextAsync(Path.Combine(repoRoot, "Nexo.AppHost", "AppHost.cs"));

        await Assert.That(appHost).Contains("WithUrlForEndpoint(\"http\"");
        await Assert.That(appHost).Contains("WithUrlForEndpoint(\"https\"");
        await Assert.That(appHost).Contains("/scalar");
        await Assert.That(appHost).Contains("Scalar API Reference");
    }

    [Test]
    public async Task AppHost_ConfiguresKeycloakAsLocalOnlyResourceForDevelopmentAuth()
    {
        var repoRoot = FindRepositoryRoot();
        var appHost = await File.ReadAllTextAsync(Path.Combine(repoRoot, "Nexo.AppHost", "AppHost.cs"));
        var appHostProject = await File.ReadAllTextAsync(Path.Combine(repoRoot, "Nexo.AppHost", "Nexo.AppHost.csproj"));

        await Assert.That(appHostProject).Contains("Aspire.Hosting.Keycloak");
        await Assert.That(appHost).Contains("AddKeycloak(\"keycloak\", 18080");
        await Assert.That(appHost).DoesNotContain("AddKeycloak(\"keycloak\", 8080");
        await Assert.That(appHost).Contains("WithRealmImport(\"./keycloak/realms\")");
        await Assert.That(appHost).Contains("ExcludeFromManifest()");
        await Assert.That(appHost).Contains("localKeycloakAuthority = $\"https://localhost:18080/realms/{localKeycloakRealm}\"");
        await Assert.That(appHost).Contains("Keycloak__Authority\", localKeycloakAuthority");
        await Assert.That(appHost).DoesNotContain("Keycloak__Authority\", $\"{keycloak.GetEndpoint(");
        await Assert.That(appHost).Contains("Keycloak Admin Console");
        await Assert.That(appHost).Contains("Keycloak__ClientId");
        await Assert.That(appHost).Contains("Keycloak__RequireHttpsMetadata");
        await Assert.That(appHost).Contains("NEXO_LOCAL_ADMIN_PASSWORD");
    }

    [Test]
    public async Task KeycloakRealmImport_DefinesNexoRealmScalarClientAndLocalUsersWithoutCommittedPasswords()
    {
        var repoRoot = FindRepositoryRoot();
        var realmPath = Path.Combine(repoRoot, "Nexo.AppHost", "keycloak", "realms", "nexo-realm.json");
        var realm = await File.ReadAllTextAsync(realmPath);

        await Assert.That(realm).Contains("\"realm\": \"nexo\"");
        await Assert.That(realm).Contains("\"clientId\": \"nexo-web-bff\"");
        await Assert.That(realm).Contains("\"clientId\": \"nexo-scalar\"");
        await Assert.That(GetClientScopeNames(realm)).Contains("profile");
        await Assert.That(GetClientScopeNames(realm)).Contains("email");
        await Assert.That(GetClientScopeNames(realm)).Contains("organization");
        await Assert.That(GetClientRedirectUris(realm, "nexo-web-bff")).IsEquivalentTo([
            "http://localhost:*",
            "https://localhost:*",
            "http://webfrontend-nexo.dev.localhost:*",
            "https://webfrontend-nexo.dev.localhost:*"
        ]);
        await Assert.That(GetClientRedirectUris(realm, "nexo-scalar")).IsEquivalentTo([
            "http://localhost:*",
            "https://localhost:*",
            "http://webfrontend-nexo.dev.localhost:*",
            "https://webfrontend-nexo.dev.localhost:*",
            "http://server-nexo.dev.localhost:*",
            "https://server-nexo.dev.localhost:*"
        ]);
        await Assert.That(GetClientWebOrigins(realm, "nexo-scalar")).IsEquivalentTo([
            "http://localhost:*",
            "https://localhost:*",
            "http://webfrontend-nexo.dev.localhost:*",
            "https://webfrontend-nexo.dev.localhost:*",
            "http://server-nexo.dev.localhost:*",
            "https://server-nexo.dev.localhost:*"
        ]);
        await Assert.That(realm).DoesNotContain("server-nexo.dev.localhost:5519");
        await Assert.That(realm).DoesNotContain("server-nexo.dev.localhost:7373");
        await Assert.That(realm).DoesNotContain("server-nexo.dev.localhost:*/scalar");
        await Assert.That(realm).DoesNotContain("webfrontend-nexo.dev.localhost:*/auth/callback");
        await Assert.That(realm).DoesNotContain("server-nexo.dev.localhost:*/*");
        await Assert.That(realm).DoesNotContain("server-nexo.dev.localhost:*/*/");
        await Assert.That(realm).Contains("\"username\": \"admin@nexo.local\"");
        await Assert.That(realm).Contains("\"username\": \"manager@nexo.local\"");
        await Assert.That(realm).Contains("\"value\": \"${NEXO_LOCAL_ADMIN_PASSWORD}\"");
        await Assert.That(realm).Contains("\"value\": \"${NEXO_LOCAL_MANAGER_PASSWORD}\"");
        await Assert.That(realm).DoesNotContain("password123");
        await Assert.That(realm).DoesNotContain("admin123");
    }

    private static string FindRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory is not null)
        {
            if (File.Exists(Path.Combine(directory.FullName, "Nexo.slnx")))
            {
                return directory.FullName;
            }

            directory = directory.Parent;
        }

        throw new DirectoryNotFoundException("Could not locate Nexo.slnx from the test output directory.");
    }

    private static string[] GetClientRedirectUris(string realm, string clientId)
    {
        return GetClientStringArray(realm, clientId, "redirectUris");
    }

    private static string[] GetClientWebOrigins(string realm, string clientId)
    {
        return GetClientStringArray(realm, clientId, "webOrigins");
    }

    private static string[] GetClientScopeNames(string realm)
    {
        using var document = JsonDocument.Parse(realm);

        return document.RootElement
            .GetProperty("clientScopes")
            .EnumerateArray()
            .Select(scope => scope.GetProperty("name").GetString()!)
            .ToArray();
    }

    private static string[] GetClientStringArray(string realm, string clientId, string propertyName)
    {
        using var document = JsonDocument.Parse(realm);
        var clients = document.RootElement.GetProperty("clients").EnumerateArray();
        var client = clients.Single(candidate => candidate.GetProperty("clientId").GetString() == clientId);

        return client
            .GetProperty(propertyName)
            .EnumerateArray()
            .Select(uri => uri.GetString()!)
            .ToArray();
    }
}
