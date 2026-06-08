namespace Nexo.Server.Modules.Core.ModuleGating;

public sealed class DevelopmentModuleGateOptions
{
    public const string SectionName = "Nexo:DevelopmentModuleGate";

    public string[] ActiveModules { get; set; } = [NexoModules.Restaurant];
}
