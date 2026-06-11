using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Nexo.Server.Data;
using Nexo.Server.Modules.Core.OrganizationContext;
using Nexo.Server.Modules.Restaurant.Features.Setup;
using TUnit.Assertions;
using TUnit.Core;

namespace Nexo.Server.Tests.Data;

public sealed class DevelopmentDatabaseInitializerTests
{
    [Test]
    public async Task StartAsync_SkipsWhenNoDatabaseProviderIsConfigured()
    {
        var services = new ServiceCollection();
        services.AddDbContext<NexoDbContext>();
        services.AddSingleton<IOrganizationContextProvider>(new FixedOrganizationContextProvider());

        await using var serviceProvider = services.BuildServiceProvider();
        var initializer = new DevelopmentDatabaseInitializer(
            serviceProvider,
            new DevelopmentHostEnvironment(),
            NullLogger<DevelopmentDatabaseInitializer>.Instance);

        await initializer.StartAsync(CancellationToken.None);
    }

    [Test]
    public async Task StartAsync_SkipsTenantSeedWhenOrganizationContextIsUnavailable()
    {
        var services = new ServiceCollection();
        services.AddDbContext<NexoDbContext>(options =>
            options.UseInMemoryDatabase($"nexo-development-init-{Guid.NewGuid()}"));
        services.AddSingleton<IOrganizationContextProvider>(new MissingOrganizationContextProvider());
        services.AddSingleton(TimeProvider.System);
        services.AddScoped<RestaurantSetupService>();

        await using var serviceProvider = services.BuildServiceProvider();
        var initializer = new DevelopmentDatabaseInitializer(
            serviceProvider,
            new DevelopmentHostEnvironment(),
            NullLogger<DevelopmentDatabaseInitializer>.Instance);

        await initializer.StartAsync(CancellationToken.None);
    }

    [Test]
    public async Task StartAsync_SkipsTenantSeedWithoutResolvingRequiredContext_WhenOptionalContextIsUnavailable()
    {
        var services = new ServiceCollection();
        services.AddDbContext<NexoDbContext>(options =>
            options.UseInMemoryDatabase($"nexo-development-init-{Guid.NewGuid()}"));
        var organizationContextProvider = new OptionalMissingOrganizationContextProvider();
        services.AddSingleton<IOrganizationContextProvider>(organizationContextProvider);
        services.AddSingleton<IOptionalOrganizationContextProvider>(organizationContextProvider);
        services.AddSingleton(TimeProvider.System);
        services.AddScoped<RestaurantSetupService>();

        await using var serviceProvider = services.BuildServiceProvider();
        var initializer = new DevelopmentDatabaseInitializer(
            serviceProvider,
            new DevelopmentHostEnvironment(),
            NullLogger<DevelopmentDatabaseInitializer>.Instance);

        await initializer.StartAsync(CancellationToken.None);

        await Assert.That(organizationContextProvider.RequiredContextCalls).IsEqualTo(0);
    }

    private sealed class FixedOrganizationContextProvider : IOrganizationContextProvider
    {
        public ValueTask<OrganizationContext> GetCurrentAsync(CancellationToken cancellationToken = default)
        {
            return ValueTask.FromResult(new OrganizationContext(Guid.Parse("00000000-0000-7000-8000-000000000001")));
        }
    }

    private sealed class MissingOrganizationContextProvider : IOrganizationContextProvider
    {
        public ValueTask<OrganizationContext> GetCurrentAsync(CancellationToken cancellationToken = default)
        {
            throw new InvalidOperationException("Organization context requires an authenticated session with a valid organization id.");
        }
    }

    private sealed class OptionalMissingOrganizationContextProvider :
        IOrganizationContextProvider,
        IOptionalOrganizationContextProvider
    {
        public int RequiredContextCalls { get; private set; }

        public ValueTask<OrganizationContext> GetCurrentAsync(CancellationToken cancellationToken = default)
        {
            RequiredContextCalls++;
            throw new InvalidOperationException("Organization context requires an authenticated session with a valid organization id.");
        }

        public ValueTask<OrganizationContext?> TryGetCurrentAsync(CancellationToken cancellationToken = default)
        {
            return ValueTask.FromResult<OrganizationContext?>(null);
        }
    }

    private sealed class DevelopmentHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;

        public string ApplicationName { get; set; } = "Nexo.Server.Tests";

        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;

        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
