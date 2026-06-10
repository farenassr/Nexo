using System.Security.Cryptography;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.WebUtilities;

namespace Nexo.Server.Modules.Shared.Auth;

public sealed class NexoCookieAuthenticationEvents : CookieAuthenticationEvents
{
    public override async Task ValidatePrincipal(CookieValidatePrincipalContext context)
    {
        if (context.Principal is null)
        {
            context.RejectPrincipal();
            return;
        }

        var refreshService = context.HttpContext.RequestServices.GetRequiredService<IKeycloakTokenRefreshService>();
        if (!refreshService.ShouldRefresh(context.Properties))
        {
            return;
        }

        var refresh = await refreshService.RefreshAsync(
            context.Principal,
            context.Properties,
            context.HttpContext.RequestAborted);
        if (!refresh.Succeeded)
        {
            context.RejectPrincipal();
            await context.HttpContext.SignOutAsync(NexoAuthSchemes.Session);
            return;
        }

        context.ShouldRenew = true;
    }

    public override Task SigningIn(CookieSigningInContext context)
    {
        context.HttpContext.Response.Cookies.Append(
            NexoAuthConstants.CsrfCookieName,
            WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32)),
            BuildCsrfCookieOptions());

        return Task.CompletedTask;
    }

    public override Task SigningOut(CookieSigningOutContext context)
    {
        context.HttpContext.Response.Cookies.Delete(
            NexoAuthConstants.CsrfCookieName,
            BuildCsrfCookieOptions());

        return Task.CompletedTask;
    }

    private static CookieOptions BuildCsrfCookieOptions()
    {
        return new CookieOptions
        {
            HttpOnly = false,
            IsEssential = true,
            Path = "/",
            SameSite = SameSiteMode.Lax,
            Secure = true
        };
    }
}
