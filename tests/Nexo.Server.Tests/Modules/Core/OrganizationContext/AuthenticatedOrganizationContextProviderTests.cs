using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Nexo.Server.Modules.Core.OrganizationContext;
using TUnit.Assertions;
using TUnit.Core;

namespace Nexo.Server.Tests.Modules.Core.OrganizationContext;

public sealed class AuthenticatedOrganizationContextProviderTests
{
    [Test]
    public async Task GetCurrentAsync_ReturnsOrganizationIdFromKeycloakOrganizationClaim()
    {
        var organizationId = Guid.Parse("b36cfb51-83bd-4376-b7d7-0502141ff6ae");
        var provider = CreateAuthenticatedProvider(
            new ClaimsPrincipal(new ClaimsIdentity(
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
                "test")));

        var context = await provider.GetCurrentAsync();

        await Assert.That(context.OrganizationId).IsEqualTo(organizationId);
    }

    [Test]
    public async Task GetCurrentAsync_FailsClosedWhenAuthenticatedSessionHasNoOrganizationId()
    {
        var provider = CreateAuthenticatedProvider(
            new ClaimsPrincipal(new ClaimsIdentity([new Claim("sub", "user-1")], "test")));

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => provider.GetCurrentAsync().AsTask());

        await Assert.That(exception!.Message).Contains("valid organization id");
    }

    [Test]
    public async Task GetCurrentAsync_FailsClosedWhenNoHttpContextExists()
    {
        var provider = CreateAuthenticatedProvider(user: null);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(
            () => provider.GetCurrentAsync().AsTask());

        await Assert.That(exception!.Message).Contains("authenticated session");
    }

    [Test]
    public async Task TryGetCurrentAsync_ReturnsOrganizationIdFromKeycloakOrganizationClaim()
    {
        var organizationId = Guid.Parse("b36cfb51-83bd-4376-b7d7-0502141ff6ae");
        var provider = CreateAuthenticatedProvider(
            new ClaimsPrincipal(new ClaimsIdentity(
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
                "test")));

        var context = await provider.TryGetCurrentAsync();

        await Assert.That(context!.OrganizationId).IsEqualTo(organizationId);
    }

    [Test]
    public async Task TryGetCurrentAsync_ReturnsNullWhenNoHttpContextExists()
    {
        var provider = CreateAuthenticatedProvider(user: null);

        var context = await provider.TryGetCurrentAsync();

        await Assert.That(context).IsNull();
    }

    private static AuthenticatedOrganizationContextProvider CreateAuthenticatedProvider(ClaimsPrincipal? user)
    {
        var httpContextAccessor = new HttpContextAccessor();
        if (user is not null)
        {
            httpContextAccessor.HttpContext = new DefaultHttpContext
            {
                User = user
            };
        }

        return new AuthenticatedOrganizationContextProvider(httpContextAccessor, new CurrentOrganizationAccessor());
    }
}
