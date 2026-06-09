using Nexo.Server.Modules.Restaurant.Features.Availability;
using Nexo.Server.Modules.Restaurant.Features.Dashboard;
using Nexo.Server.Modules.Restaurant.Features.FloorPlans;
using Nexo.Server.Modules.Restaurant.Features.Reservations;
using Nexo.Server.Modules.Restaurant.Features.TableBlocks;

namespace Nexo.Server.Modules.Restaurant.Authorization;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddRestaurantModule(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services
            .AddOptions<DevelopmentRestaurantPermissionOptions>()
            .Bind(configuration.GetSection(DevelopmentRestaurantPermissionOptions.SectionName));

        services.AddScoped<IRestaurantPermissionAuthorizer, DevelopmentRestaurantPermissionAuthorizer>();
        services.AddScoped<RestaurantAccessService>();
        services.AddScoped<RestaurantAvailabilityService>();
        services.AddScoped<RestaurantDashboardService>();
        services.AddScoped<RestaurantFloorPlanService>();
        services.AddScoped<RestaurantReservationService>();
        services.AddScoped<RestaurantTableBlockService>();
        services.AddSingleton<RestaurantReservationConsistencyGuard>();
        services.AddSingleton(TimeProvider.System);

        return services;
    }
}
