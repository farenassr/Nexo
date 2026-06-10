namespace Nexo.Server.Modules.Shared.Auth;

public readonly record struct KeycloakTokenRefreshResult(bool Succeeded)
{
    public static KeycloakTokenRefreshResult Success() => new(true);

    public static KeycloakTokenRefreshResult Failed() => new(false);
}
