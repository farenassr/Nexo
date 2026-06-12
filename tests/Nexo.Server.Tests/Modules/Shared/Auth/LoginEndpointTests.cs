using System.Net;
using System.Security.Claims;
using System.Text.Encodings.Web;
using FastEndpoints;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Nexo.Server.Modules.Shared.Auth;
using Nexo.Server.Modules.Shared.Auth.Features;
using Nexo.Shared.Auth;
using TUnit.Assertions;
using TUnit.Core;

namespace Nexo.Server.Tests.Modules.Shared.Auth;

public sealed class LoginEndpointTests
{
    [Test]
    public async Task GetLogin_PreservesChallengeRedirectResponse()
    {
        await using var app = await BuildLoginTestAppAsync(useForwardedHeaders: false);
        using var client = app.GetTestClient();

        var response = await client.GetAsync("/auth/login?returnUrl=%2F");

        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.Redirect);
        await Assert.That(response.Headers.Location?.ToString()).Contains("redirect_uri=http%3A%2F%2Flocalhost%2Fauth%2Fcallback");
    }

    [Test]
    public async Task GetLogin_UsesForwardedFrontendOriginForChallengeRedirect()
    {
        await using var app = await BuildLoginTestAppAsync(useForwardedHeaders: true);
        using var client = app.GetTestClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/auth/login?returnUrl=%2F");
        request.Headers.TryAddWithoutValidation("X-Forwarded-Host", "webfrontend-nexo.dev.localhost:55809");
        request.Headers.TryAddWithoutValidation("X-Forwarded-Proto", "http");

        var response = await client.SendAsync(request);

        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.Redirect);
        await Assert.That(response.Headers.Location?.ToString())
            .Contains("redirect_uri=http%3A%2F%2Fwebfrontend-nexo.dev.localhost%3A55809%2Fauth%2Fcallback");
    }

    [Test]
    public async Task AuthMe_AllowsAnonymousRequestToReturnUnauthorized()
    {
        var repoRoot = FindRepositoryRoot();
        var endpoint = await File.ReadAllTextAsync(Path.Combine(
            repoRoot,
            "Nexo.Server",
            "Modules",
            "Shared",
            "Auth",
            "Features",
            "AuthMeEndpoint.cs"));

        await Assert.That(endpoint).Contains("AllowAnonymous();");
        await Assert.That(endpoint).Contains("Send.UnauthorizedAsync");
    }

    [Test]
    public async Task AuthMe_ResponseDoesNotExposeRawIdentityProviderClaims()
    {
        var user = new ClaimsPrincipal(new ClaimsIdentity(
            [
                new Claim("sub", "user-1"),
                new Claim("preferred_username", "ada"),
                new Claim("email", "ada@example.com"),
                new Claim("groups", "internal-provider-group"),
                new Claim(
                    "organization",
                    """
                    {
                      "la-terraza-org": {
                        "id": "b36cfb51-83bd-4376-b7d7-0502141ff6ae"
                      }
                    }
                    """),
                new Claim("roles", "restaurant-admin")
            ],
            "test"));

        var response = AuthMeEndpoint.BuildResponse(user);

        await Assert.That(response.IsAuthenticated).IsTrue();
        await Assert.That(response.UserId).IsEqualTo("user-1");
        await Assert.That(response.Name).IsEqualTo("ada");
        await Assert.That(response.Email).IsEqualTo("ada@example.com");
        await Assert.That(response.OrganizationId).IsEqualTo("b36cfb51-83bd-4376-b7d7-0502141ff6ae");
        await Assert.That(response.Roles).IsEquivalentTo(["restaurant-admin"]);
        await Assert.That(typeof(AuthSessionResponse).GetProperty("Claims")).IsNull();
    }

    private static async Task<WebApplication> BuildLoginTestAppAsync(bool useForwardedHeaders)
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseTestServer();
        builder.Services.AddFastEndpoints(options =>
        {
            options.Filter = type => type == typeof(LoginEndpoint);
        });
        builder.Services.AddAuthentication(options =>
            {
                options.DefaultChallengeScheme = NexoAuthSchemes.Keycloak;
            })
            .AddScheme<AuthenticationSchemeOptions, RedirectChallengeHandler>(
                NexoAuthSchemes.Keycloak,
                _ => { });
        builder.Services.AddSingleton<IKeycloakTokenRefreshService, NoOpKeycloakTokenRefreshService>();
        builder.Services.Configure<KeycloakOptions>(options =>
        {
            options.Authority = "https://identity.example.test/realms/nexo";
            options.Realm = "nexo";
            options.ClientId = "nexo-web-bff";
            options.ClientSecret = "configured-outside-source-control";
            options.LogoutRedirectUri = "https://app.example.test/login";
        });

        var app = builder.Build();
        if (useForwardedHeaders)
        {
            app.UseForwardedHeaders(new ForwardedHeadersOptions
            {
                ForwardedHeaders = ForwardedHeaders.XForwardedHost | ForwardedHeaders.XForwardedProto
            });
        }

        app.UseAuthentication();
        app.UseFastEndpoints();
        await app.StartAsync();
        return app;
    }

    private static string FindRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory is not null)
        {
            if (File.Exists(Path.Combine(directory.FullName, "Nexo.slnx")))
            {
                return directory.FullName;
            }

            directory = directory.Parent;
        }

        throw new DirectoryNotFoundException("Could not locate Nexo.slnx from the test output directory.");
    }

    private sealed class RedirectChallengeHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
    {
        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        protected override Task HandleChallengeAsync(AuthenticationProperties properties)
        {
            var redirectUri = Uri.EscapeDataString($"{Request.Scheme}://{Request.Host}/auth/callback");
            Response.Redirect($"https://identity.example.test/login?redirect_uri={redirectUri}");
            return Task.CompletedTask;
        }
    }

    private sealed class NoOpKeycloakTokenRefreshService : IKeycloakTokenRefreshService
    {
        public bool ShouldRefresh(AuthenticationProperties properties)
        {
            return false;
        }

        public Task<KeycloakTokenRefreshResult> RefreshAsync(
            ClaimsPrincipal principal,
            AuthenticationProperties properties,
            CancellationToken cancellationToken)
        {
            return Task.FromResult(KeycloakTokenRefreshResult.Failed());
        }
    }
}
