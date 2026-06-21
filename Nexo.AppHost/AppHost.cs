var builder = DistributedApplication.CreateBuilder(args);

const string localKeycloakRealm = "nexo";
const string localBffClientId = "nexo-web-bff";
const string localScalarClientId = "nexo-scalar";
const string localKeycloakAuthority = $"https://localhost:18080/realms/{localKeycloakRealm}";

var postgres = builder.AddPostgres("postgres");
var database = postgres.AddDatabase("database");

var server = builder.AddProject<Projects.Nexo_Server>("server")
    .WithReference(database)
    .WaitFor(database)
    .WithHttpHealthCheck("/health")
    .WithExternalHttpEndpoints()
    .WithUrlForEndpoint("http", url =>
    {
        url.Url = $"{url.Url.TrimEnd('/')}/scalar";
        url.DisplayText = "Scalar API Reference";
    })
    .WithUrlForEndpoint("https", url =>
    {
        url.Url = $"{url.Url.TrimEnd('/')}/scalar";
        url.DisplayText = "Scalar API Reference";
    });

if (!builder.ExecutionContext.IsPublishMode)
{
    var keycloakAdminPassword = builder.AddParameter("keycloak-admin-password", secret: true);
    var localAdminPassword = builder.AddParameter("nexo-local-admin-password", secret: true);
    var localManagerPassword = builder.AddParameter("nexo-local-manager-password", secret: true);

    var keycloak = builder.AddKeycloak("keycloak", 18080, adminPassword: keycloakAdminPassword)
        .WithDataVolume()
        .WithRealmImport("./keycloak/realms")
        .WithEnvironment("NEXO_LOCAL_ADMIN_PASSWORD", localAdminPassword)
        .WithEnvironment("NEXO_LOCAL_MANAGER_PASSWORD", localManagerPassword)
        .ExcludeFromManifest()
        .WithUrlForEndpoint("https", url =>
        {
            url.Url = "https://localhost:18080/admin";
            url.DisplayText = "Keycloak Admin Console";
        });

    server
        .WithReference(keycloak)
        .WaitFor(keycloak)
        .WithEnvironment("Keycloak__Authority", localKeycloakAuthority)
        .WithEnvironment("Keycloak__Realm", localKeycloakRealm)
        .WithEnvironment("Keycloak__ClientId", localBffClientId)
        .WithEnvironment("Keycloak__ScalarClientId", localScalarClientId)
        .WithEnvironment("Keycloak__RequireHttpsMetadata", "false")
        .WithEnvironment("Keycloak__LogoutRedirectUri", "http://localhost:5173/login");
}

var webfrontend = builder.AddViteApp("webfrontend", "../frontend")
    .WithReference(server)
    .WaitFor(server);

server.PublishWithContainerFiles(webfrontend, "wwwroot");

builder.Build().Run();
