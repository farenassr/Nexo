namespace Nexo.Server.Modules.Core.CompanyContext;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddCompanyContext(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services
            .AddOptions<DevelopmentCompanyContextOptions>()
            .Bind(configuration.GetSection(DevelopmentCompanyContextOptions.SectionName));

        services.AddScoped<ICompanyContextProvider, DevelopmentCompanyContextProvider>();

        return services;
    }
}
