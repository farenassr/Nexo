using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Nexo.Server.Modules.Shared.Auth;

public sealed class DevelopmentAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IConfiguration configuration)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var companyId = configuration["Nexo:DevelopmentCompanyContext:CompanyId"]
                        ?? "00000000-0000-7000-8000-000000000001";
        Claim[] claims =
        [
            new("sub", "development-user"),
            new("name", "Development User"),
            new("preferred_username", "development"),
            new("email", "development@nexo.local"),
            new("company_id", companyId)
        ];

        var identity = new ClaimsIdentity(claims, Scheme.Name, "name", ClaimTypes.Role);
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
