namespace Nexo.Server.Modules.Core.CompanyContext;

public interface ICompanyContextProvider
{
    ValueTask<CompanyContext> GetCurrentAsync(CancellationToken cancellationToken = default);
}
