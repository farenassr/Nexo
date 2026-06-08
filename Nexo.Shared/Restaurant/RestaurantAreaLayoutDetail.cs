namespace Nexo.Shared.Restaurant;

public sealed record RestaurantAreaLayoutDetail(
    Guid AreaId,
    string AreaName,
    decimal X,
    decimal Y,
    decimal Width,
    decimal Height,
    decimal RotationDegrees,
    int ZIndex);
