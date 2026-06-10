using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;

namespace Nexo.Server.Modules.Shared.Auth;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddKeycloakAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var useDevelopmentAuthentication = configuration.GetValue<bool>("Nexo:DevelopmentAuthentication:Enabled");

        services.AddOptions<KeycloakOptions>()
            .Bind(configuration.GetSection(KeycloakOptions.SectionName))
            .ValidateOnStart();
        services.AddSingleton<IValidateOptions<KeycloakOptions>, KeycloakOptionsValidator>();
        services.AddScoped<NexoCookieAuthenticationEvents>();
        services.AddHttpClient<IKeycloakTokenRefreshService, KeycloakTokenRefreshService>();

        var authenticationBuilder = services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = useDevelopmentAuthentication
                    ? NexoAuthSchemes.Development
                    : NexoAuthSchemes.Session;
                options.DefaultSignInScheme = NexoAuthSchemes.Session;
                options.DefaultChallengeScheme = useDevelopmentAuthentication
                    ? NexoAuthSchemes.Development
                    : NexoAuthSchemes.Keycloak;
            })
            .AddCookie(NexoAuthSchemes.Session)
            .AddOpenIdConnect(NexoAuthSchemes.Keycloak, _ => { });

        if (useDevelopmentAuthentication)
        {
            authenticationBuilder.AddScheme<AuthenticationSchemeOptions, DevelopmentAuthenticationHandler>(
                NexoAuthSchemes.Development,
                _ => { });
        }

        services.AddOptions<CookieAuthenticationOptions>(NexoAuthSchemes.Session)
            .Configure<IOptions<KeycloakOptions>>((cookieOptions, keycloakOptionsAccessor) =>
            {
                var keycloakOptions = keycloakOptionsAccessor.Value;
                cookieOptions.Cookie.Name = "__Host-nexo-bff";
                cookieOptions.Cookie.HttpOnly = true;
                cookieOptions.Cookie.IsEssential = true;
                cookieOptions.Cookie.Path = "/";
                cookieOptions.Cookie.SameSite = SameSiteMode.Lax;
                cookieOptions.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                cookieOptions.EventsType = typeof(NexoCookieAuthenticationEvents);
                cookieOptions.ExpireTimeSpan = TimeSpan.FromMinutes(keycloakOptions.SessionLifetimeMinutes);
                cookieOptions.SlidingExpiration = false;
                cookieOptions.LoginPath = "/auth/login";
                cookieOptions.LogoutPath = "/auth/logout";
            });

        services.AddOptions<OpenIdConnectOptions>(NexoAuthSchemes.Keycloak)
            .Configure<IOptions<KeycloakOptions>>((oidcOptions, keycloakOptionsAccessor) =>
            {
                var keycloakOptions = keycloakOptionsAccessor.Value;
                oidcOptions.Authority = keycloakOptions.Authority;
                oidcOptions.ClientId = keycloakOptions.ClientId;
                oidcOptions.ClientSecret = keycloakOptions.ClientSecret;
                oidcOptions.CallbackPath = keycloakOptions.CallbackPath;
                oidcOptions.GetClaimsFromUserInfoEndpoint = true;
                oidcOptions.MapInboundClaims = false;
                oidcOptions.RequireHttpsMetadata = keycloakOptions.RequireHttpsMetadata;
                oidcOptions.ResponseType = OpenIdConnectResponseType.Code;
                oidcOptions.PushedAuthorizationBehavior = PushedAuthorizationBehavior.Disable;
                oidcOptions.SaveTokens = true;
                oidcOptions.SignInScheme = NexoAuthSchemes.Session;
                oidcOptions.UsePkce = true;
                oidcOptions.Scope.Clear();
                foreach (var scope in keycloakOptions.Scopes.Distinct(StringComparer.Ordinal))
                {
                    oidcOptions.Scope.Add(scope);
                }

                oidcOptions.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidAudience = keycloakOptions.ClientId,
                    NameClaimType = "name",
                    RoleClaimType = "role"
                };
            });

        return services;
    }

    public static IServiceCollection AddKeycloakAuthorization(this IServiceCollection services)
    {
        services.AddAuthorization();
        return services;
    }
}
