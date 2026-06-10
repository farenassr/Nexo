using System.Net;
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Nexo.Server.Modules.Shared.Auth;
using TUnit.Assertions;
using TUnit.Core;

namespace Nexo.Server.Tests.Modules.Shared.Auth;

public sealed class KeycloakTokenRefreshServiceTests
{
    [Test]
    public async Task RefreshAsync_UsesServerSideRefreshTokenAndClientSecret()
    {
        var handler = new RecordingTokenHandler();
        var service = new KeycloakTokenRefreshService(
            new HttpClient(handler),
            Options.Create(new KeycloakOptions
            {
                Authority = "https://identity.example.test/realms/nexo",
                Realm = "nexo",
                ClientId = "nexo-web-bff",
                ClientSecret = "secret-from-user-secrets",
                CallbackPath = "/auth/callback",
                LogoutRedirectUri = "https://app.example.test/login",
                Scopes = ["openid", "profile", "email"]
            }),
            TimeProvider.System,
            NullLogger<KeycloakTokenRefreshService>.Instance);

        var principal = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, "user-1")],
            NexoAuthSchemes.Session));
        var properties = new AuthenticationProperties();
        properties.StoreTokens(
            [
                new AuthenticationToken { Name = "refresh_token", Value = "refresh-1" },
                new AuthenticationToken { Name = "access_token", Value = "old-access" },
                new AuthenticationToken { Name = "expires_at", Value = "2026-06-09T08:00:00.0000000+00:00" }
            ]);

        var result = await service.RefreshAsync(principal, properties, CancellationToken.None);

        await Assert.That(result.Succeeded).IsTrue();
        await Assert.That(handler.RequestUri?.ToString()).IsEqualTo(
            "https://identity.example.test/realms/nexo/protocol/openid-connect/token");
        await Assert.That(handler.Form["grant_type"]).IsEqualTo("refresh_token");
        await Assert.That(handler.Form["client_id"]).IsEqualTo("nexo-web-bff");
        await Assert.That(handler.Form["client_secret"]).IsEqualTo("secret-from-user-secrets");
        await Assert.That(handler.Form["refresh_token"]).IsEqualTo("refresh-1");
        await Assert.That(properties.GetTokenValue("access_token")).IsEqualTo("new-access");
        await Assert.That(properties.GetTokenValue("refresh_token")).IsEqualTo("refresh-2");
    }

    [Test]
    public async Task RefreshAsync_ReturnsFailedWhenTokenRequestIsCanceledByHttpClient()
    {
        var service = new KeycloakTokenRefreshService(
            new HttpClient(new CanceledTokenHandler()),
            Options.Create(new KeycloakOptions
            {
                Authority = "https://identity.example.test/realms/nexo",
                Realm = "nexo",
                ClientId = "nexo-web-bff",
                ClientSecret = "secret-from-user-secrets",
                CallbackPath = "/auth/callback",
                LogoutRedirectUri = "https://app.example.test/login",
                Scopes = ["openid", "profile", "email"]
            }),
            TimeProvider.System,
            NullLogger<KeycloakTokenRefreshService>.Instance);

        var principal = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, "user-1")],
            NexoAuthSchemes.Session));
        var properties = new AuthenticationProperties();
        properties.StoreTokens(
            [
                new AuthenticationToken { Name = "refresh_token", Value = "refresh-1" },
                new AuthenticationToken { Name = "access_token", Value = "old-access" }
            ]);

        var result = await service.RefreshAsync(principal, properties, CancellationToken.None);

        await Assert.That(result.Succeeded).IsFalse();
        await Assert.That(properties.GetTokenValue("access_token")).IsEqualTo("old-access");
    }

    private sealed class RecordingTokenHandler : HttpMessageHandler
    {
        public Uri? RequestUri { get; private set; }

        public Dictionary<string, string> Form { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            RequestUri = request.RequestUri;
            var body = await request.Content!.ReadAsStringAsync(cancellationToken);
            foreach (var pair in body.Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var parts = pair.Split('=', 2);
                Form[WebUtility.UrlDecode(parts[0])] = WebUtility.UrlDecode(parts[1]);
            }

            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    """
                    {
                      "access_token": "new-access",
                      "refresh_token": "refresh-2",
                      "id_token": "id-token-2",
                      "expires_in": 300
                    }
                    """)
            };
        }
    }

    private sealed class CanceledTokenHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            throw new TaskCanceledException("The token endpoint request timed out.");
        }
    }
}
