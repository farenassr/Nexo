namespace Nexo.Server.Modules.Core.OrganizationContext;

public sealed class OrganizationContextMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(
        HttpContext context,
        IOptionalOrganizationContextProvider organizationContextProvider,
        ICurrentOrganizationAccessor currentOrganizationAccessor)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var organizationContext = await organizationContextProvider.TryGetCurrentAsync(context.RequestAborted);
            currentOrganizationAccessor.OrganizationId = organizationContext?.OrganizationId;
        }

        await next(context);
    }
}
