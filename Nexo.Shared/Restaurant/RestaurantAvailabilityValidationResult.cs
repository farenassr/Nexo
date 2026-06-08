namespace Nexo.Shared.Restaurant;

public sealed record RestaurantAvailabilityValidationResult(
    bool IsAvailable,
    RestaurantAvailabilityFailureCode Code,
    string Message,
    DateTimeOffset StartAt,
    DateTimeOffset EndAt,
    IReadOnlyCollection<Guid> TableIds)
{
    public static RestaurantAvailabilityValidationResult Available(
        DateTimeOffset startAt,
        DateTimeOffset endAt,
        IReadOnlyCollection<Guid> tableIds)
    {
        return new RestaurantAvailabilityValidationResult(
            true,
            RestaurantAvailabilityFailureCode.None,
            "Available",
            startAt,
            endAt,
            tableIds);
    }

    public static RestaurantAvailabilityValidationResult Rejected(
        RestaurantAvailabilityFailureCode code,
        string message,
        DateTimeOffset startAt,
        DateTimeOffset endAt,
        IReadOnlyCollection<Guid> tableIds)
    {
        return new RestaurantAvailabilityValidationResult(false, code, message, startAt, endAt, tableIds);
    }
}
