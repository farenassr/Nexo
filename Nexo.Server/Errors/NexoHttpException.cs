using Microsoft.AspNetCore.Mvc;

namespace Nexo.Server.Errors;

public sealed class NexoHttpException : Exception
{
    public NexoHttpException(
        int statusCode,
        string code,
        string title,
        string? detail = null,
        string? module = null,
        string? feature = null,
        string? reason = null,
        string? type = null,
        Exception? innerException = null)
        : base(title, innerException)
    {
        StatusCode = statusCode;
        Code = code;
        Title = title;
        Detail = detail;
        Module = module;
        Feature = feature;
        Reason = reason;
        Type = string.IsNullOrWhiteSpace(type)
            ? NexoProblemDetailsTypes.FromCode(code)
            : type;
    }

    public int StatusCode { get; }

    public string Code { get; }

    public string Title { get; }

    public string? Detail { get; }

    public string? Module { get; }

    public string? Feature { get; }

    public string? Reason { get; }

    public string Type { get; }

    public ProblemDetails ToProblemDetails()
    {
        var problemDetails = NexoProblemDetails.Create(
            StatusCode,
            Code,
            Title,
            Detail,
            Type,
            Module,
            Feature,
            Reason);

        return problemDetails;
    }
}
