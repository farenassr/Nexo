namespace Nexo.Server.Modules.Core.ModuleGating;

public interface IModuleGate
{
    ValueTask<ModuleGateResult> EnsureActiveAsync(
        Guid organizationId,
        string moduleKey,
        CancellationToken cancellationToken = default);
}
