using Microsoft.Extensions.Options;

namespace Nexo.Server.Modules.Shared.Auth;

public sealed class KeycloakOptionsValidator : IValidateOptions<KeycloakOptions>
{
    public ValidateOptionsResult Validate(string? name, KeycloakOptions options)
    {
        List<string> failures = [];

        if (string.IsNullOrWhiteSpace(options.Authority))
        {
            failures.Add("Keycloak:Authority is required.");
        }
        else if (!Uri.TryCreate(options.Authority, UriKind.Absolute, out var authority))
        {
            failures.Add("Keycloak:Authority must be an absolute URI.");
        }
        else if (IsPlaceholderAuthority(authority))
        {
            failures.Add("Keycloak:Authority must be configured for this environment.");
        }
        else if (options.RequireHttpsMetadata
                 && authority.Scheme != Uri.UriSchemeHttps
                 && !IsLocalhost(authority.Host))
        {
            failures.Add("Keycloak:Authority must use HTTPS unless it points to localhost.");
        }

        if (string.IsNullOrWhiteSpace(options.Realm))
        {
            failures.Add("Keycloak:Realm is required.");
        }

        if (string.IsNullOrWhiteSpace(options.ClientId))
        {
            failures.Add("Keycloak:ClientId is required.");
        }

        if (string.IsNullOrWhiteSpace(options.ClientSecret))
        {
            failures.Add("Keycloak:ClientSecret is required.");
        }

        if (string.IsNullOrWhiteSpace(options.CallbackPath) || !options.CallbackPath.StartsWith('/'))
        {
            failures.Add("Keycloak:CallbackPath must be an absolute application path.");
        }

        if (string.IsNullOrWhiteSpace(options.LogoutRedirectUri)
            || !Uri.TryCreate(options.LogoutRedirectUri, UriKind.Absolute, out _))
        {
            failures.Add("Keycloak:LogoutRedirectUri must be an absolute URI.");
        }

        if (!options.Scopes.Contains("openid", StringComparer.Ordinal))
        {
            failures.Add("Keycloak:Scopes must include openid.");
        }

        if (options.AccessTokenRefreshSkewMinutes < 1)
        {
            failures.Add("Keycloak:AccessTokenRefreshSkewMinutes must be at least 1.");
        }

        if (options.SessionLifetimeMinutes < 5)
        {
            failures.Add("Keycloak:SessionLifetimeMinutes must be at least 5.");
        }

        return failures.Count == 0
            ? ValidateOptionsResult.Success
            : ValidateOptionsResult.Fail(failures);
    }

    private static bool IsLocalhost(string host)
    {
        return string.Equals(host, "localhost", StringComparison.OrdinalIgnoreCase)
               || string.Equals(host, "127.0.0.1", StringComparison.OrdinalIgnoreCase)
               || string.Equals(host, "::1", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsPlaceholderAuthority(Uri authority)
    {
        return string.Equals(authority.Host, "identity.example.invalid", StringComparison.OrdinalIgnoreCase);
    }
}
