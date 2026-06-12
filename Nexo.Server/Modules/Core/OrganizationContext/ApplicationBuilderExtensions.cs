namespace Nexo.Server.Modules.Core.OrganizationContext;

public static class ApplicationBuilderExtensions
{
    public static IApplicationBuilder UseNexoOrganizationContext(this IApplicationBuilder app)
    {
        return app.UseMiddleware<OrganizationContextMiddleware>();
    }
}
