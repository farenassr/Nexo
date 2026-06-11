using System.Security.Claims;
using Nexo.Server.Modules.Shared.Auth;
using Nexo.Server.Modules.Shared.Auth.Features;
using TUnit.Assertions;
using TUnit.Core;

namespace Nexo.Server.Tests.Modules.Shared.Auth;

public sealed class OrganizationClaimParserTests
{
    private static readonly Guid OrganizationId = Guid.Parse("b36cfb51-83bd-4376-b7d7-0502141ff6ae");

    [Test]
    public async Task TryGetOrganizationId_ExtractsFirstOrganizationIdFromKeycloakOrganizationClaim()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity(
            [
                new Claim(
                    "organization",
                    """
                    {
                      "la-terraza-org": {
                        "id": "b36cfb51-83bd-4376-b7d7-0502141ff6ae"
                      }
                    }
                    """)
            ],
            "test"));

        var result = KeycloakOrganizationClaimParser.TryGetOrganizationId(principal, out var organizationId);

        await Assert.That(result).IsTrue();
        await Assert.That(organizationId).IsEqualTo(OrganizationId);
    }

    [Test]
    public async Task BuildResponse_ExposesParsedOrganizationId()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity(
            [
                new Claim("sub", "user-1"),
                new Claim(
                    "organization",
                    """
                    {
                      "la-terraza-org": {
                        "id": "b36cfb51-83bd-4376-b7d7-0502141ff6ae"
                      }
                    }
                    """)
            ],
            "test"));

        var response = AuthMeEndpoint.BuildResponse(principal);

        await Assert.That(response.OrganizationId).IsEqualTo(OrganizationId.ToString());
    }

    [Test]
    public async Task TryGetOrganizationId_RejectsInvalidOrganizationClaim()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim("organization", """{"la-terraza-org":{"id":"not-a-guid"}}""")],
            "test"));

        var result = KeycloakOrganizationClaimParser.TryGetOrganizationId(principal, out var organizationId);

        await Assert.That(result).IsFalse();
        await Assert.That(organizationId).IsEqualTo(Guid.Empty);
    }
}
