namespace Nexo.Shared.Restaurant;

public sealed record RestaurantAvailabilityTableOption(
    Guid TableId,
    string Label,
    int MinCapacity,
    int MaxCapacity,
    DateTimeOffset StartAt,
    DateTimeOffset EndAt);
