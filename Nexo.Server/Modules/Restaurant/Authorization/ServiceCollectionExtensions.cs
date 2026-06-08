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

        return services;
    }
}
