using Microsoft.AspNetCore.Mvc;

namespace Nexo.Server.Errors;

public static class NexoProblemDetails
{
    public static ProblemDetails Create(
        int statusCode,
        string code,
        string title,
        string? detail = null,
        string? type = null,
        string? module = null,
        string? feature = null,
        string? reason = null)
    {
        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Type = string.IsNullOrWhiteSpace(type)
                ? NexoProblemDetailsTypes.FromCode(code)
                : type
        };

        problemDetails.Extensions["code"] = code;
        AddIfPresent(problemDetails, "module", module);
        AddIfPresent(problemDetails, "feature", feature);
        AddIfPresent(problemDetails, "reason", reason);

        return problemDetails;
    }

    private static void AddIfPresent(ProblemDetails problemDetails, string name, string? value)
    {
        if (!string.IsNullOrWhiteSpace(value))
        {
            problemDetails.Extensions[name] = value;
        }
    }
}
