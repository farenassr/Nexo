using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;

namespace Nexo.Server.Errors;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddNexoProblemDetails(this IServiceCollection services)
    {
        services.AddExceptionHandler<NexoExceptionHandler>();
        services.AddProblemDetails(options =>
        {
            options.CustomizeProblemDetails = context =>
            {
                var statusCode = context.ProblemDetails.Status
                                 ?? context.HttpContext.Response.StatusCode;

                context.ProblemDetails.Status ??= statusCode;
                context.ProblemDetails.Title = string.IsNullOrWhiteSpace(context.ProblemDetails.Title)
                    ? ReasonPhrases.GetReasonPhrase(statusCode)
                    : context.ProblemDetails.Title;
                context.ProblemDetails.Type = string.IsNullOrWhiteSpace(context.ProblemDetails.Type)
                    ? NexoProblemDetailsTypes.FromCode($"Http{statusCode}")
                    : context.ProblemDetails.Type;

                AddExtensionIfMissing(context.ProblemDetails, "code", $"Http{statusCode}");
                AddExtensionIfMissing(
                    context.ProblemDetails,
                    "traceId",
                    Activity.Current?.Id ?? context.HttpContext.TraceIdentifier);
            };
        });

        return services;
    }

    private static void AddExtensionIfMissing(ProblemDetails problemDetails, string name, string value)
    {
        if (!problemDetails.Extensions.ContainsKey(name))
        {
            problemDetails.Extensions[name] = value;
        }
    }
}
