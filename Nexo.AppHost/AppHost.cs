var builder = DistributedApplication.CreateBuilder(args);

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

var webfrontend = builder.AddViteApp("webfrontend", "../frontend")
    .WithReference(server)
    .WaitFor(server);

server.PublishWithContainerFiles(webfrontend, "wwwroot");

builder.Build().Run();
