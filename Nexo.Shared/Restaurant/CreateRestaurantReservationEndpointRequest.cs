namespace Nexo.Shared.Restaurant;

public sealed class CreateRestaurantReservationEndpointRequest
{
    public Guid BranchId { get; set; }
    public IReadOnlyCollection<Guid> TableIds { get; set; } = [];
    public int PartySize { get; set; }
    public DateTimeOffset StartAt { get; set; }
    public int? DurationMinutes { get; set; }
    public string CustomerFullName { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }
    public string? CustomerEmail { get; set; }
    public RestaurantReservationSource Source { get; set; } = RestaurantReservationSource.Staff;
    public string? SpecialRequests { get; set; }
}
