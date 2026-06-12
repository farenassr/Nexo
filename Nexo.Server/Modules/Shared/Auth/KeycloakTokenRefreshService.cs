using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Nexo.Server.Modules.Shared.Auth;

public sealed class KeycloakTokenRefreshService(
    HttpClient httpClient,
    IOptions<KeycloakOptions> options,
    TimeProvider timeProvider,
    ILogger<KeycloakTokenRefreshService> logger) : IKeycloakTokenRefreshService
{
    private readonly KeycloakOptions options = options.Value;

    public bool ShouldRefresh(AuthenticationProperties properties)
    {
        var expiresAtValue = properties.GetTokenValue("expires_at");
        if (string.IsNullOrWhiteSpace(expiresAtValue)
            || !DateTimeOffset.TryParse(expiresAtValue, out var expiresAt))
        {
            return false;
        }

        var refreshAt = expiresAt.Subtract(TimeSpan.FromMinutes(options.AccessTokenRefreshSkewMinutes));
        return timeProvider.GetUtcNow() >= refreshAt;
    }

    public async Task<KeycloakTokenRefreshResult> RefreshAsync(
        ClaimsPrincipal principal,
        AuthenticationProperties properties,
        CancellationToken cancellationToken)
    {
        if (principal.Identity?.IsAuthenticated != true)
        {
            return KeycloakTokenRefreshResult.Failed();
        }

        var refreshToken = properties.GetTokenValue("refresh_token");
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            return KeycloakTokenRefreshResult.Failed();
        }

        var tokenRequest = new Dictionary<string, string>
        {
            ["grant_type"] = "refresh_token",
            ["client_id"] = options.ClientId,
            ["refresh_token"] = refreshToken
        };

        if (!string.IsNullOrWhiteSpace(options.ClientSecret))
        {
            tokenRequest["client_secret"] = options.ClientSecret;
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, options.TokenEndpoint)
        {
            Content = new FormUrlEncodedContent(tokenRequest)
        };

        HttpResponseMessage response;
        try
        {
            response = await httpClient.SendAsync(request, cancellationToken);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning("Keycloak refresh request was canceled before a response was received.");
            return KeycloakTokenRefreshResult.Failed();
        }
        catch (HttpRequestException exception)
        {
            logger.LogWarning(exception, "Keycloak refresh request failed.");
            return KeycloakTokenRefreshResult.Failed();
        }

        using (response)
        {
            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning(
                    "Keycloak refresh failed with status code {StatusCode}.",
                    (int)response.StatusCode);
                return KeycloakTokenRefreshResult.Failed();
            }

            KeycloakTokenResponse? payload;
            try
            {
                payload = await response.Content.ReadFromJsonAsync<KeycloakTokenResponse>(
                    cancellationToken);
            }
            catch (JsonException exception)
            {
                logger.LogWarning(exception, "Keycloak refresh response could not be parsed.");
                return KeycloakTokenRefreshResult.Failed();
            }

            if (payload is null || string.IsNullOrWhiteSpace(payload.AccessToken))
            {
                logger.LogWarning("Keycloak refresh response did not include an access token.");
                return KeycloakTokenRefreshResult.Failed();
            }

            properties.UpdateTokenValue("access_token", payload.AccessToken);

            if (!string.IsNullOrWhiteSpace(payload.RefreshToken))
            {
                properties.UpdateTokenValue("refresh_token", payload.RefreshToken);
            }

            if (!string.IsNullOrWhiteSpace(payload.IdToken))
            {
                properties.UpdateTokenValue("id_token", payload.IdToken);
            }

            if (payload.ExpiresIn > 0)
            {
                var expiresAt = timeProvider.GetUtcNow().AddSeconds(payload.ExpiresIn);
                properties.UpdateTokenValue("expires_at", expiresAt.ToString("o"));
            }

            return KeycloakTokenRefreshResult.Success();
        }
    }

    private sealed class KeycloakTokenResponse
    {
        [JsonPropertyName("access_token")]
        public string AccessToken { get; init; } = "";

        [JsonPropertyName("refresh_token")]
        public string? RefreshToken { get; init; }

        [JsonPropertyName("id_token")]
        public string? IdToken { get; init; }

        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; init; }
    }
}
