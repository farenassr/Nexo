using Microsoft.Extensions.Options;

namespace Nexo.Server.Modules.Core.ModuleGating;

public sealed class DevelopmentModuleGate(
    IOptions<DevelopmentModuleGateOptions> options) : IModuleGate
{
    public ValueTask<ModuleGateResult> EnsureActiveAsync(
        Guid organizationId,
        string moduleKey,
        CancellationToken cancellationToken = default)
    {
        var activeModules = options.Value.ActiveModules
            .Where(static module => !string.IsNullOrWhiteSpace(module))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        return ValueTask.FromResult(
            activeModules.Contains(moduleKey)
                ? ModuleGateResult.Active()
                : ModuleGateResult.Inactive());
    }
}
