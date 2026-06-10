namespace Nexo.Server.Modules.Shared.Auth;

public static class ApplicationBuilderExtensions
{
    public static IApplicationBuilder UseNexoCsrfProtection(this IApplicationBuilder app)
    {
        return app.UseMiddleware<CsrfProtectionMiddleware>();
    }
}
