using TUnit.Assertions;
using TUnit.Core;

namespace Nexo.Server.Tests.Modules.Restaurant.Architecture;

public sealed class RestaurantOpenApiContractTests
{
    [Test]
    public async Task RestaurantEndpoints_DoNotUseObjectAsSuccessResponseType()
    {
        var endpointFiles = Directory.GetFiles(
            Path.Combine(GetRepositoryRoot(), "Nexo.Server", "Modules", "Restaurant"),
            "*.cs",
            SearchOption.AllDirectories);

        var objectResponseEndpoints = endpointFiles
            .Select(path => new
            {
                Path = path,
                Text = File.ReadAllText(path)
            })
            .Where(file => file.Text.Contains("EndpointWithoutRequest<object>", StringComparison.Ordinal)
                           || file.Text.Contains(", object>", StringComparison.Ordinal))
            .Select(file => Path.GetRelativePath(GetRepositoryRoot(), file.Path))
            .Order(StringComparer.Ordinal)
            .ToArray();

        await Assert.That(objectResponseEndpoints).IsEmpty();
    }

    private static string GetRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "Nexo.slnx")))
        {
            directory = directory.Parent;
        }

        return directory?.FullName ?? throw new InvalidOperationException("Could not locate repository root.");
    }
}
