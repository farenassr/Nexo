using Nexo.Server.Data;
using Nexo.Server.Modules.Core.OrganizationContext;
using Nexo.Server.Modules.Core.ModuleGating;
using Nexo.Server.Modules.Restaurant.Authorization;

namespace Nexo.Server.Modules;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddNexoModules(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddNexoPersistence(configuration);
        services.AddOrganizationContext(configuration);
        services.AddModuleGating(configuration);
        services.AddRestaurantModule(configuration);

        return services;
    }
}
