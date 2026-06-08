namespace Nexo.Shared.Restaurant;

public sealed record RestaurantContextResponse(
    Guid CompanyId,
    string ModuleKey,
    string[] PermissionContracts);
