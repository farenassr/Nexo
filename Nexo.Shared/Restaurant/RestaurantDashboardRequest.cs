namespace Nexo.Shared.Restaurant;

public sealed class RestaurantDashboardRequest
{
    public RestaurantDashboardRequest()
    {
    }

    public RestaurantDashboardRequest(Guid branchId, DateOnly date)
    {
        BranchId = branchId;
        Date = date;
    }

    public Guid BranchId { get; set; }
    public DateOnly Date { get; set; }
}
