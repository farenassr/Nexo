var builder = DistributedApplication.CreateBuilder(args);

var keycloakIssuer = builder.AddParameterFromConfiguration(
    "keycloak-issuer",
    "KEYCLOAK_ISSUER");
var keycloakRealm = builder.AddParameterFromConfiguration(
    "keycloak-realm",
    "KEYCLOAK_REALM");
var keycloakClientId = builder.AddParameterFromConfiguration(
    "keycloak-client-id",
    "KEYCLOAK_CLIENT_ID");
var keycloakClientSecret = builder.AddParameterFromConfiguration(
    "keycloak-client-secret",
    "KEYCLOAK_CLIENT_SECRET",
    secret: true);
var keycloakRedirectUri = builder.AddParameterFromConfiguration(
    "keycloak-redirect-uri",
    "KEYCLOAK_REDIRECT_URI");

var cache = builder.AddRedis("cache");
var postgres = builder.AddPostgres("postgres");
var database = postgres.AddDatabase("database");

var server = builder.AddProject<Projects.Nexo_Server>("server")
    .WithReference(database)
    .WithReference(cache)
    .WaitFor(database)
    .WaitFor(cache)
    .WithHttpHealthCheck("/health")
    .WithExternalHttpEndpoints()
    .WithEnvironment("Keycloak__Authority", keycloakIssuer)
    .WithEnvironment("Keycloak__Realm", keycloakRealm)
    .WithEnvironment("Keycloak__ClientId", keycloakClientId)
    .WithEnvironment("Keycloak__ClientSecret", keycloakClientSecret)
    .WithEnvironment("Keycloak__LogoutRedirectUri", keycloakRedirectUri);

var webfrontend = builder.AddViteApp("webfrontend", "../frontend")
    .WithReference(server)
    .WaitFor(server);

server.PublishWithContainerFiles(webfrontend, "wwwroot");

builder.Build().Run();
