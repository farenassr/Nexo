namespace Nexo.Server.Modules.Core.ModuleGating;

public interface IModuleGate
{
    ValueTask<ModuleGateResult> EnsureActiveAsync(
        Guid companyId,
        string moduleKey,
        CancellationToken cancellationToken = default);
}
