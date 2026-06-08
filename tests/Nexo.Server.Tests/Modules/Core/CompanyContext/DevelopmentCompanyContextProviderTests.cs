using Microsoft.Extensions.Options;
using Nexo.Server.Modules.Core.CompanyContext;
using TUnit.Assertions;
using TUnit.Core;

namespace Nexo.Server.Tests.Modules.Core.CompanyContext;

public sealed class DevelopmentCompanyContextProviderTests
{
    [Test]
    public async Task GetCurrentAsync_ReturnsConfiguredCompanyId()
    {
        var companyId = Guid.Parse("11111111-1111-7111-8111-111111111111");
        var provider = new DevelopmentCompanyContextProvider(
            Options.Create(new DevelopmentCompanyContextOptions
            {
                CompanyId = companyId
            }));

        var context = await provider.GetCurrentAsync();

        await Assert.That(context.CompanyId).IsEqualTo(companyId);
    }
}
