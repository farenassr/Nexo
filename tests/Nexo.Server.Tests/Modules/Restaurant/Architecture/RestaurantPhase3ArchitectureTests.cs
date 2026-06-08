using TUnit.Assertions;
using TUnit.Core;
using System.Text.RegularExpressions;

namespace Nexo.Server.Tests.Modules.Restaurant.Architecture;

public sealed class RestaurantPhase3ArchitectureTests
{
    [Test]
    public async Task Phase3RequestAndResponseContracts_LiveInSharedProject()
    {
        var repoRoot = FindRepositoryRoot();
        var serverFeatureFiles = Directory.GetFiles(
            Path.Combine(repoRoot, "Nexo.Server", "Modules", "Restaurant", "Features"),
            "*.cs",
            SearchOption.AllDirectories);
        var sharedContractsPath = Path.Combine(repoRoot, "Nexo.Shared", "Restaurant");

        var serverRequestOrResponseDtos = new List<string>();
        foreach (var serverFeatureFile in serverFeatureFiles)
        {
            var source = await File.ReadAllTextAsync(serverFeatureFile);
            if (Regex.IsMatch(source, @"\b(?:public\s+)?sealed\s+(?:record|class)\s+\w+(?:Request|Response)\b"))
            {
                serverRequestOrResponseDtos.Add(serverFeatureFile);
            }
        }

        await Assert.That(serverRequestOrResponseDtos.Distinct().ToArray()).IsEmpty();
        await Assert.That(Directory.Exists(sharedContractsPath)).IsTrue();

        var sharedContracts = string.Join(
            Environment.NewLine,
            await Task.WhenAll(Directory
                .GetFiles(sharedContractsPath, "*.cs")
                .Select(static sourceFile => File.ReadAllTextAsync(sourceFile))));
        await Assert.That(sharedContracts).Contains("namespace Nexo.Shared.Restaurant;");
        await Assert.That(sharedContracts).Contains("RestaurantContextResponse");
        await Assert.That(sharedContracts).Contains("CreateRestaurantReservationRequest");
        await Assert.That(sharedContracts).Contains("RestaurantAvailabilitySearchResult");
        await Assert.That(sharedContracts).Contains("RestaurantReservationDetail");
    }

    [Test]
    public async Task SharedRestaurantContracts_UseOnePublicTypePerFile()
    {
        var repoRoot = FindRepositoryRoot();
        var sharedContractsPath = Path.Combine(repoRoot, "Nexo.Shared", "Restaurant");
        var violations = new List<string>();

        foreach (var sourceFile in Directory.GetFiles(sharedContractsPath, "*.cs"))
        {
            var source = await File.ReadAllTextAsync(sourceFile);
            var publicTypeCount = Regex.Matches(
                source,
                @"\bpublic\s+(?:sealed\s+)?(?:record|class|enum)\s+\w+").Count;

            if (publicTypeCount > 1)
            {
                violations.Add($"{Path.GetFileName(sourceFile)} declares {publicTypeCount} public types");
            }
        }

        await Assert.That(violations).IsEmpty();
    }

    [Test]
    public async Task RestaurantEndpoints_LiveInUseCaseFolders()
    {
        var repoRoot = FindRepositoryRoot();
        var featuresPath = Path.Combine(repoRoot, "Nexo.Server", "Modules", "Restaurant", "Features");
        var endpointFiles = Directory.GetFiles(featuresPath, "*Endpoint.cs", SearchOption.AllDirectories);
        var misplacedEndpointFiles = endpointFiles
            .Where(endpointFile =>
            {
                var parent = new DirectoryInfo(Path.GetDirectoryName(endpointFile)!);
                return parent.Name is "Availability" or "Reservations";
            })
            .Select(endpointFile => Path.GetRelativePath(featuresPath, endpointFile))
            .ToArray();

        await Assert.That(misplacedEndpointFiles).IsEmpty();

        var expectedUseCaseFolders = new[]
        {
            Path.Combine("Availability", "Search", "SearchRestaurantAvailabilityEndpoint.cs"),
            Path.Combine("Reservations", "Create", "CreateRestaurantReservationEndpoint.cs"),
            Path.Combine("Reservations", "ListDaily", "ListRestaurantReservationsEndpoint.cs"),
            Path.Combine("Reservations", "GetDetails", "GetRestaurantReservationEndpoint.cs"),
            Path.Combine("Reservations", "UpdateStatus", "UpdateRestaurantReservationStatusEndpoint.cs"),
            Path.Combine("Reservations", "Cancel", "CancelRestaurantReservationEndpoint.cs"),
            Path.Combine("Reservations", "ListByTable", "ListRestaurantTableReservationsEndpoint.cs")
        };

        foreach (var expectedUseCaseFolder in expectedUseCaseFolders)
        {
            await Assert.That(File.Exists(Path.Combine(featuresPath, expectedUseCaseFolder))).IsTrue();
        }
    }

    [Test]
    public async Task Phase3ReadQueries_UseNoTrackingQueryableExtensions()
    {
        var repoRoot = FindRepositoryRoot();
        var extensionsPath = Path.Combine(
            repoRoot,
            "Nexo.Server",
            "Modules",
            "Restaurant",
            "Data",
            "Extensions",
            "RestaurantQueryExtensions.cs");
        var availabilityServicePath = Path.Combine(
            repoRoot,
            "Nexo.Server",
            "Modules",
            "Restaurant",
            "Features",
            "Availability",
            "RestaurantAvailabilityService.cs");
        var reservationServicePath = Path.Combine(
            repoRoot,
            "Nexo.Server",
            "Modules",
            "Restaurant",
            "Features",
            "Reservations",
            "RestaurantReservationService.cs");

        await Assert.That(File.Exists(extensionsPath)).IsTrue();

        var extensions = await File.ReadAllTextAsync(extensionsPath);
        await Assert.That(extensions).Contains("AsNoTracking()");
        await Assert.That(extensions).Contains("ForBranch(");
        await Assert.That(extensions).Contains("ActiveOnly(");
        await Assert.That(extensions).Contains("Overlapping(");
        await Assert.That(extensions).Contains("ForReservationDetails(");

        var availabilityService = await File.ReadAllTextAsync(availabilityServicePath);
        var reservationService = await File.ReadAllTextAsync(reservationServicePath);
        await Assert.That(availabilityService).Contains("ForBranch(");
        await Assert.That(availabilityService).Contains("Overlapping(");
        await Assert.That(reservationService).Contains("ForReservationDetails(");
        await Assert.That(reservationService).Contains("ForUtcDate(");
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
