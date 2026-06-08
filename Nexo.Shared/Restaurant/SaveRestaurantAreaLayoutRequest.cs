namespace Nexo.Shared.Restaurant;

public sealed record SaveRestaurantAreaLayoutRequest(
    Guid AreaId,
    decimal X,
    decimal Y,
    decimal Width,
    decimal Height,
    decimal RotationDegrees,
    int ZIndex);
