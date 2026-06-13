using FastEndpoints;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;
using Microsoft.Extensions.Options;
using Nexo.Server.Modules.Shared.Auth;

namespace Nexo.Server.OpenApi;

public sealed class NexoOpenApiSecurityOperationTransformer : IOpenApiOperationTransformer
{
    public Task TransformAsync(
        OpenApiOperation operation,
        OpenApiOperationTransformerContext context,
        CancellationToken cancellationToken)
    {
        var endpointMetadata = context.Description.ActionDescriptor.EndpointMetadata;
        ApplyFastEndpointsSummary(operation, endpointMetadata);

        if (endpointMetadata.OfType<IAllowAnonymous>().Any())
        {
            operation.Security = [];
            return Task.CompletedTask;
        }

        operation.Security ??= [];
        AddSecurityRequirement(operation, context.Document!, KeycloakOpenApiSecurityTransformer.BearerSchemeName);
        var keycloakOptions = context.ApplicationServices.GetRequiredService<IOptions<KeycloakOptions>>().Value;
        AddSecurityRequirement(
            operation,
            context.Document!,
            KeycloakOpenApiSecurityTransformer.KeycloakSchemeName,
            keycloakOptions.Scopes.Distinct(StringComparer.Ordinal));

        return Task.CompletedTask;
    }

    private static void ApplyFastEndpointsSummary(
        OpenApiOperation operation,
        IList<object> endpointMetadata)
    {
        var summary = endpointMetadata
            .OfType<EndpointDefinition>()
            .FirstOrDefault()
            ?.EndpointSummary;
        if (summary is null)
        {
            return;
        }

        operation.Summary ??= summary.Summary;
        operation.Description ??= summary.Description;
    }

    private static void AddSecurityRequirement(
        OpenApiOperation operation,
        OpenApiDocument document,
        string schemeName,
        IEnumerable<string>? scopes = null)
    {
        if (operation.Security!.Any(requirement =>
                requirement.Keys.Any(reference => reference.Reference.Id == schemeName)))
        {
            return;
        }

        operation.Security!.Add(new OpenApiSecurityRequirement
        {
            [new OpenApiSecuritySchemeReference(schemeName, document)] = scopes?.ToList() ?? []
        });
    }
}
