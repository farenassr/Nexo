namespace Nexo.Shared.Auth;

public sealed record AuthSessionResponse(
    bool IsAuthenticated,
    string? UserId,
    string? Name,
    string? Email,
    string? OrganizationId,
    IReadOnlyCollection<string> Roles);
