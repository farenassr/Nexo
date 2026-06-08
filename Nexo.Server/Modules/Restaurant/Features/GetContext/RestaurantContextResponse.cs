namespace Nexo.Server.Modules.Restaurant.Features.GetContext;

public sealed record RestaurantContextResponse(
    Guid CompanyId,
    string ModuleKey,
    string[] PermissionContracts);
