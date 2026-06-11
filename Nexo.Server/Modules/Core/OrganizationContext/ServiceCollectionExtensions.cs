namespace Nexo.Server.Modules.Core.OrganizationContext;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddOrganizationContext(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddHttpContextAccessor();
        services.AddScoped<AuthenticatedOrganizationContextProvider>();
        services.AddScoped<IOrganizationContextProvider>(provider =>
            provider.GetRequiredService<AuthenticatedOrganizationContextProvider>());
        services.AddScoped<IOptionalOrganizationContextProvider>(provider =>
            provider.GetRequiredService<AuthenticatedOrganizationContextProvider>());

        return services;
    }
}
