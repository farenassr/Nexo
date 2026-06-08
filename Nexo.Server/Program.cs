using FastEndpoints;
using Nexo.Server.Modules;

var builder = WebApplication.CreateBuilder(args);

// Add service defaults & Aspire client integrations.
builder.AddServiceDefaults();
builder.AddRedisClientBuilder("cache")
    .WithOutputCache();

// Add services to the container.
builder.Services.AddProblemDetails();
builder.Services.AddFastEndpoints();
builder.Services.AddNexoModules(builder.Configuration);

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseOutputCache();
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
