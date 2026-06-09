using Microsoft.EntityFrameworkCore;

namespace Nexo.Server.Data;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddNexoPersistence(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddDbContext<NexoDbContext>(options =>
        {
            var connectionString = configuration.GetConnectionString("database");
            if (!string.IsNullOrWhiteSpace(connectionString))
            {
                options.UseNpgsql(connectionString);
            }
        });
        services.AddHostedService<DevelopmentDatabaseInitializer>();

        return services;
    }
}
