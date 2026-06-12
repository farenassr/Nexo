using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Nexo.Server.Modules.Core.OrganizationContext;

namespace Nexo.Server.Data;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddNexoPersistence(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.TryAddScoped<ICurrentOrganizationAccessor, CurrentOrganizationAccessor>();
        services.AddDbContext<NexoDbContext>(options =>
        {
            var connectionString = configuration.GetConnectionString("database");
            if (!string.IsNullOrWhiteSpace(connectionString))
            {
                options.UseNpgsql(connectionString);
            }
        });
        if (!string.IsNullOrWhiteSpace(configuration.GetConnectionString("database")))
        {
            services.AddHealthChecks()
                .AddCheck<NexoDbContextHealthCheck>("database", tags: ["ready"]);
        }

        services.AddHostedService<DevelopmentDatabaseInitializer>();

        return services;
    }
}
