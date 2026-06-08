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
        var project = await File.ReadAllTextAsync(Path.Combine(repoRoot, "Nexo.Server", "Nexo.Server.csproj"));

        await Assert.That(project).Contains("Scalar.AspNetCore");
        await Assert.That(program).Contains("using Scalar.AspNetCore;");
        await Assert.That(program).Contains("app.MapScalarApiReference();");
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
