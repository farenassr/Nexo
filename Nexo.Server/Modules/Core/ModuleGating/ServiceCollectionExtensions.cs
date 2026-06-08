namespace Nexo.Server.Modules.Core.ModuleGating;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddModuleGating(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services
            .AddOptions<DevelopmentModuleGateOptions>()
            .Bind(configuration.GetSection(DevelopmentModuleGateOptions.SectionName));

        services.AddScoped<IModuleGate, DevelopmentModuleGate>();

        return services;
    }
}
