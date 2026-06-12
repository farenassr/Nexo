using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Nexo.Server.Errors;

public sealed class NexoExceptionHandler(
    IProblemDetailsService problemDetailsService,
    ILogger<NexoExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (httpContext.Response.HasStarted)
        {
            return false;
        }

        var problemDetails = exception is NexoHttpException knownException
            ? knownException.ToProblemDetails()
            : CreateUnexpectedProblemDetails(exception, httpContext);

        httpContext.Response.StatusCode = problemDetails.Status ?? StatusCodes.Status500InternalServerError;

        await problemDetailsService.WriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = problemDetails
        });

        return true;
    }

    private ProblemDetails CreateUnexpectedProblemDetails(Exception exception, HttpContext httpContext)
    {
        logger.LogError(
            exception,
            "Unhandled exception while processing {Method} {Path}.",
            httpContext.Request.Method,
            httpContext.Request.Path);

        return NexoProblemDetails.Create(
            StatusCodes.Status500InternalServerError,
            "UnexpectedError",
            "An unexpected error occurred.",
            type: NexoProblemDetailsTypes.FromCode("UnexpectedError"));
    }
}
