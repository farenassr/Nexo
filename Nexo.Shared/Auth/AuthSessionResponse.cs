namespace Nexo.Shared.Auth;

public sealed record AuthSessionResponse(
    bool IsAuthenticated,
    string? UserId,
    string? Name,
    string? Email,
    string? CompanyId,
    IReadOnlyCollection<string> Roles,
    IReadOnlyCollection<AuthClaimResponse> Claims);

public sealed record AuthClaimResponse(string Type, string Value);
