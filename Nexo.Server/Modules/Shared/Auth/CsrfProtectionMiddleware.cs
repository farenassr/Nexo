using System.Security.Cryptography;
using System.Text;
using Nexo.Server.Errors;

namespace Nexo.Server.Modules.Shared.Auth;

public sealed class CsrfProtectionMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, IProblemDetailsService problemDetailsService)
    {
        if (RequiresCsrfValidation(context))
        {
            var cookieToken = context.Request.Cookies[NexoAuthConstants.CsrfCookieName];
            var headerToken = context.Request.Headers[NexoAuthConstants.CsrfHeaderName].ToString();

            if (!ConstantTimeEquals(cookieToken, headerToken))
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await problemDetailsService.WriteAsync(new ProblemDetailsContext
                {
                    HttpContext = context,
                    ProblemDetails = NexoProblemDetails.Create(
                        StatusCodes.Status400BadRequest,
                        "CsrfValidationFailed",
                        "CSRF validation failed.",
                        "A valid CSRF token header is required for this request.",
                        module: "auth",
                        feature: "csrf",
                        reason: "MissingOrInvalidToken")
                });
                return;
            }
        }

        await next(context);
    }

    private static bool RequiresCsrfValidation(HttpContext context)
    {
        return HttpMethods.IsPost(context.Request.Method)
               || HttpMethods.IsPut(context.Request.Method)
               || HttpMethods.IsPatch(context.Request.Method)
               || HttpMethods.IsDelete(context.Request.Method);
    }

    private static bool ConstantTimeEquals(string? first, string? second)
    {
        if (string.IsNullOrWhiteSpace(first) || string.IsNullOrWhiteSpace(second))
        {
            return false;
        }

        var firstBytes = Encoding.UTF8.GetBytes(first);
        var secondBytes = Encoding.UTF8.GetBytes(second);
        return firstBytes.Length == secondBytes.Length
               && CryptographicOperations.FixedTimeEquals(firstBytes, secondBytes);
    }
}
