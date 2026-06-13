using FastEndpoints;
using Azure.Identity;
using Microsoft.AspNetCore.HttpOverrides;
using Nexo.Server.Errors;
using Nexo.Server.Modules;
using Nexo.Server.OpenApi;
using Nexo.Server.Modules.Core.OrganizationContext;
using Nexo.Server.Modules.Shared.Auth;

var builder = WebApplication.CreateBuilder(args);

var keyVaultUri = builder.Configuration["KeyVault:Uri"];
if (!builder.Environment.IsDevelopment() && !string.IsNullOrWhiteSpace(keyVaultUri))
{
    builder.Configuration.AddAzureKeyVault(new Uri(keyVaultUri), new DefaultAzureCredential());
}

// Add service defaults & Aspire client integrations.
builder.AddServiceDefaults();
// Redis-backed output caching is intentionally disabled until Nexo has a
// domain cache strategy and Redis is approved for publication again.

// Add services to the container.
builder.Services.AddNexoProblemDetails();
builder.Services.AddFastEndpoints();
builder.Services.AddKeycloakAuthentication(builder.Configuration);
builder.Services.AddKeycloakAuthorization();
builder.Services.AddNexoModules(builder.Configuration);

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer<KeycloakOpenApiSecurityTransformer>();
    options.AddOperationTransformer<NexoOpenApiSecurityOperationTransformer>();
});

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseExceptionHandler();
app.UseStatusCodePages();
app.Use(async (context, next) =>
{
    try
    {
        await next(context);
    }
    catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
    {
        // The browser can abort in-flight API calls when the user changes tabs/routes.
    }
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapNexoScalarApiReference();
}

if (app.Environment.IsDevelopment())
{
    app.UseForwardedHeaders(new ForwardedHeadersOptions
    {
        ForwardedHeaders = ForwardedHeaders.XForwardedHost | ForwardedHeaders.XForwardedProto
    });
}

app.UseAuthentication();
app.UseNexoOrganizationContext();
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
