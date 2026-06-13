using TUnit.Assertions;
using TUnit.Core;

namespace Nexo.Server.Tests.Harness;

public sealed class AspireAppHostResourceUrlTests
{
    [Test]
    public async Task ServerResource_DeepLinksToScalarInAspireDashboard()
    {
        var repoRoot = FindRepositoryRoot();
        var appHost = await File.ReadAllTextAsync(Path.Combine(repoRoot, "Nexo.AppHost", "AppHost.cs"));

        await Assert.That(appHost).Contains("WithUrlForEndpoint(\"http\"");
        await Assert.That(appHost).Contains("WithUrlForEndpoint(\"https\"");
        await Assert.That(appHost).Contains("/scalar");
        await Assert.That(appHost).Contains("Scalar API Reference");
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
