namespace Nexo.Server.Modules.Restaurant.Authorization;

public sealed class DevelopmentRestaurantPermissionOptions
{
    public const string SectionName = "Nexo:DevelopmentRestaurantPermissions";

    public string[] GrantedPermissions { get; set; } = [RestaurantPermissions.ContextRead];
}
