namespace Nexo.Server.Modules.Core.ModuleGating;

public sealed record ModuleGateResult(bool IsActive)
{
    public static ModuleGateResult Active()
    {
        return new ModuleGateResult(true);
    }

    public static ModuleGateResult Inactive()
    {
        return new ModuleGateResult(false);
    }
}
