using Microsoft.Extensions.Options;

namespace Nexo.Server.Modules.Core.CompanyContext;

public sealed class DevelopmentCompanyContextProvider(
    IOptions<DevelopmentCompanyContextOptions> options) : ICompanyContextProvider
{
    public ValueTask<CompanyContext> GetCurrentAsync(CancellationToken cancellationToken = default)
    {
        var companyId = options.Value.CompanyId;
        if (companyId == Guid.Empty)
        {
            throw new InvalidOperationException("Development company context requires a non-empty company id.");
        }

        return ValueTask.FromResult(new CompanyContext(companyId));
    }
}
