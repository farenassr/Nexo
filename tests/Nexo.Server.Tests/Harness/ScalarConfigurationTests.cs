using TUnit.Assertions;
using TUnit.Core;

namespace Nexo.Server.Tests.Harness;

public sealed class ScalarConfigurationTests
{
    [Test]
    public async Task ServerDevelopmentPipeline_MapsScalarApiReference()
    {
        var repoRoot = FindRepositoryRoot();
        var program = await File.ReadAllTextAsync(Path.Combine(repoRoot, "Nexo.Server", "Program.cs"));
        var scalarExtensions = await File.ReadAllTextAsync(
            Path.Combine(repoRoot, "Nexo.Server", "OpenApi", "ScalarEndpointRouteBuilderExtensions.cs"));
        var project = await File.ReadAllTextAsync(Path.Combine(repoRoot, "Nexo.Server", "Nexo.Server.csproj"));

        await Assert.That(project).Contains("Scalar.AspNetCore");
        await Assert.That(program).Contains("app.MapNexoScalarApiReference();");
        await Assert.That(scalarExtensions).Contains("using Scalar.AspNetCore;");
        await Assert.That(scalarExtensions).Contains("MapScalarApiReference");
        await Assert.That(scalarExtensions).Contains("AddPreferredSecuritySchemes");
        await Assert.That(scalarExtensions).Contains("AddAuthorizationCodeFlow");
    }

    [Test]
    public async Task ServerPipeline_SuppressesRequestAbortCancellations()
    {
        var repoRoot = FindRepositoryRoot();
        var program = await File.ReadAllTextAsync(Path.Combine(repoRoot, "Nexo.Server", "Program.cs"));

        await Assert.That(program).Contains("OperationCanceledException");
        await Assert.That(program).Contains("context.RequestAborted.IsCancellationRequested");
    }

    private static string FindRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);

        while (directory is not null)
        {
            if (File.Exists(Path.Combine(directory.FullName, "Nexo.slnx")))
            {
                return directory.FullName;
            }

            directory = directory.Parent;
        }

        throw new DirectoryNotFoundException("Could not locate Nexo.slnx from the test output directory.");
    }
}
