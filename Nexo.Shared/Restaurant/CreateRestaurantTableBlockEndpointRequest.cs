namespace Nexo.Shared.Restaurant;

public sealed class CreateRestaurantTableBlockEndpointRequest
{
    public Guid BranchId { get; set; }
    public Guid? FloorId { get; set; }
    public Guid? AreaId { get; set; }
    public Guid? TableId { get; set; }
    public DateTimeOffset StartAt { get; set; }
    public DateTimeOffset EndAt { get; set; }
    public string? Reason { get; set; }
}
