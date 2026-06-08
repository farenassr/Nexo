using Nexo.Server.Modules.Core.CompanyContext;
using Nexo.Server.Modules.Core.ModuleGating;
using Nexo.Server.Modules.Restaurant.Authorization;

namespace Nexo.Server.Modules;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddNexoModules(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddCompanyContext(configuration);
        services.AddModuleGating(configuration);
        services.AddRestaurantModule(configuration);

        return services;
    }
}
