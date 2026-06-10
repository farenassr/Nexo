using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Hosting;
using TUnit.Assertions;
using TUnit.Core;

namespace Nexo.Server.Tests.ServiceDefaults;

public sealed class DefaultEndpointMappingTests
{
    [Test]
    public async Task MapDefaultEndpoints_RegistersHealthAndAliveOutsideDevelopment()
    {
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions
        {
            EnvironmentName = Environments.Production
        });
        builder.AddDefaultHealthChecks();

        await using var app = builder.Build();

        app.MapDefaultEndpoints();

        var routePatterns = ((IEndpointRouteBuilder)app).DataSources
            .SelectMany(static dataSource => dataSource.Endpoints)
            .OfType<RouteEndpoint>()
            .Select(static endpoint => endpoint.RoutePattern.RawText)
            .ToArray();

        await Assert.That(routePatterns).Contains("/health");
        await Assert.That(routePatterns).Contains("/alive");
    }
}
