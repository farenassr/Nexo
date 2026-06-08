namespace Nexo.Shared.Restaurant;

public sealed class SearchRestaurantAvailabilityEndpointRequest
{
    public Guid BranchId { get; set; }
    public int PartySize { get; set; }
    public DateTimeOffset StartAt { get; set; }
    public int? DurationMinutes { get; set; }
}
