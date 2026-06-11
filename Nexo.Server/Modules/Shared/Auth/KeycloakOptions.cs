namespace Nexo.Server.Modules.Shared.Auth;

public sealed class KeycloakOptions
{
    public const string SectionName = "Keycloak";

    public string Authority { get; set; } = "";

    public string Realm { get; set; } = "";

    public string ClientId { get; set; } = "";

    public string ClientSecret { get; set; } = "";

    public string CallbackPath { get; set; } = "/auth/callback";

    public string LogoutRedirectUri { get; set; } = "";

    public string[] Scopes { get; set; } = ["openid", "profile", "email", "organization"];

    public int AccessTokenRefreshSkewMinutes { get; set; } = 2;

    public int SessionLifetimeMinutes { get; set; } = 480;

    public bool RequireHttpsMetadata { get; set; } = true;

    public string TokenEndpoint => $"{Authority.TrimEnd('/')}/protocol/openid-connect/token";

    public string EndSessionEndpoint => $"{Authority.TrimEnd('/')}/protocol/openid-connect/logout";
}
