using System.Security.Claims;
using System.Text.Json;

namespace Nexo.Server.Modules.Shared.Auth;

public static class KeycloakOrganizationClaimParser
{
    private static readonly string[] DirectOrganizationClaimTypes =
    [
        "organization_id",
        "org_id",
        "tenant_id"
    ];

    public static bool TryGetOrganizationId(ClaimsPrincipal principal, out Guid organizationId)
    {
        foreach (var claim in principal.FindAll("organization"))
        {
            if (TryParseOrganizationClaimValue(claim.Value, out organizationId))
            {
                return true;
            }
        }

        foreach (var claimType in DirectOrganizationClaimTypes)
        {
            var claimValue = principal.FindFirstValue(claimType);
            if (Guid.TryParse(claimValue, out organizationId) && organizationId != Guid.Empty)
            {
                return true;
            }
        }

        organizationId = Guid.Empty;
        return false;
    }

    private static bool TryParseOrganizationClaimValue(string? claimValue, out Guid organizationId)
    {
        if (Guid.TryParse(claimValue, out organizationId) && organizationId != Guid.Empty)
        {
            return true;
        }

        if (string.IsNullOrWhiteSpace(claimValue))
        {
            organizationId = Guid.Empty;
            return false;
        }

        try
        {
            using var document = JsonDocument.Parse(claimValue);
            if (TryReadOrganizationId(document.RootElement, out organizationId))
            {
                return true;
            }
        }
        catch (JsonException)
        {
        }

        organizationId = Guid.Empty;
        return false;
    }

    private static bool TryReadOrganizationId(JsonElement element, out Guid organizationId)
    {
        if (element.ValueKind != JsonValueKind.Object)
        {
            organizationId = Guid.Empty;
            return false;
        }

        if (element.TryGetProperty("id", out var idProperty)
            && idProperty.ValueKind == JsonValueKind.String
            && Guid.TryParse(idProperty.GetString(), out organizationId)
            && organizationId != Guid.Empty)
        {
            return true;
        }

        foreach (var organizationProperty in element.EnumerateObject())
        {
            if (organizationProperty.Value.ValueKind != JsonValueKind.Object)
            {
                continue;
            }

            if (organizationProperty.Value.TryGetProperty("id", out var nestedIdProperty)
                && nestedIdProperty.ValueKind == JsonValueKind.String
                && Guid.TryParse(nestedIdProperty.GetString(), out organizationId)
                && organizationId != Guid.Empty)
            {
                return true;
            }
        }

        organizationId = Guid.Empty;
        return false;
    }
}
