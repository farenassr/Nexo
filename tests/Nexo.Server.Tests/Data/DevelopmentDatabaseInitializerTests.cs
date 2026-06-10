using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Nexo.Server.Data;
using Nexo.Server.Modules.Core.CompanyContext;
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
        services.AddSingleton<ICompanyContextProvider>(new FixedCompanyContextProvider());

        await using var serviceProvider = services.BuildServiceProvider();
        var initializer = new DevelopmentDatabaseInitializer(
            serviceProvider,
            new DevelopmentHostEnvironment(),
            NullLogger<DevelopmentDatabaseInitializer>.Instance);

        await initializer.StartAsync(CancellationToken.None);
    }

    private sealed class FixedCompanyContextProvider : ICompanyContextProvider
    {
        public ValueTask<CompanyContext> GetCurrentAsync(CancellationToken cancellationToken = default)
        {
            return ValueTask.FromResult(new CompanyContext(Guid.Parse("00000000-0000-7000-8000-000000000001")));
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
