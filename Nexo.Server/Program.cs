using FastEndpoints;
using Azure.Identity;
using Microsoft.AspNetCore.HttpOverrides;
using Nexo.Server.Modules;
using Nexo.Server.Modules.Shared.Auth;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

var keyVaultUri = builder.Configuration["KeyVault:Uri"];
if (!builder.Environment.IsDevelopment() && !string.IsNullOrWhiteSpace(keyVaultUri))
{
    builder.Configuration.AddAzureKeyVault(new Uri(keyVaultUri), new DefaultAzureCredential());
}

// Add service defaults & Aspire client integrations.
builder.AddServiceDefaults();
builder.AddRedisClientBuilder("cache")
    .WithOutputCache();

// Add services to the container.
builder.Services.AddProblemDetails();
builder.Services.AddFastEndpoints();
builder.Services.AddKeycloakAuthentication(builder.Configuration);
builder.Services.AddKeycloakAuthorization();
builder.Services.AddNexoModules(builder.Configuration);

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

if (app.Environment.IsDevelopment())
{
    app.UseForwardedHeaders(new ForwardedHeadersOptions
    {
        ForwardedHeaders = ForwardedHeaders.XForwardedHost | ForwardedHeaders.XForwardedProto
    });
}

app.UseOutputCache();
app.UseAuthentication();
app.UseNexoCsrfProtection();
app.UseAuthorization();
app.UseFastEndpoints(config =>
{
    if (!app.Environment.IsDevelopment())
    {
        config.Endpoints.Filter = endpoint =>
            !endpoint.Routes.Contains("/v1/restaurant/context", StringComparer.OrdinalIgnoreCase);
    }
});

app.MapDefaultEndpoints();

app.UseFileServer();

app.Run();
