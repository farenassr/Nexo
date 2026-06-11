namespace Nexo.Shared.Restaurant;

public sealed record RestaurantContextResponse(
    Guid OrganizationId,
    string ModuleKey,
    string[] PermissionContracts);
