using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Nexo.Server.Errors;
using Nexo.Server.Modules.Shared.Auth;
using TUnit.Assertions;
using TUnit.Core;

namespace Nexo.Server.Tests.Errors;

public sealed class NexoProblemDetailsTests
{
    [Test]
    public async Task KnownHttpException_ReturnsProblemDetailsWithStableExtensions()
    {
        await using var app = await BuildProblemDetailsAppAsync();
        using var client = app.GetTestClient();

        using var response = await client.GetAsync("/known");
        using var body = await ReadProblemDetailsAsync(response);

        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.Conflict);
        await Assert.That(response.Content.Headers.ContentType?.MediaType).IsEqualTo("application/problem+json");
        await Assert.That(body.RootElement.GetProperty("type").GetString()).IsEqualTo("https://nexo.app/problems/restaurant-reservation-conflict");
        await Assert.That(body.RootElement.GetProperty("title").GetString()).IsEqualTo("Reservation conflict.");
        await Assert.That(body.RootElement.GetProperty("status").GetInt32()).IsEqualTo(StatusCodes.Status409Conflict);
        await Assert.That(body.RootElement.GetProperty("detail").GetString()).IsEqualTo("The requested table is not available for the selected time.");
        await Assert.That(body.RootElement.GetProperty("code").GetString()).IsEqualTo("RestaurantReservationConflict");
        await Assert.That(body.RootElement.GetProperty("module").GetString()).IsEqualTo("restaurant");
        await Assert.That(body.RootElement.GetProperty("feature").GetString()).IsEqualTo("reservations");
        await Assert.That(body.RootElement.GetProperty("reason").GetString()).IsEqualTo("Conflict");
        await Assert.That(body.RootElement.TryGetProperty("traceId", out _)).IsTrue();
    }

    [Test]
    public async Task UnexpectedException_ReturnsGenericProblemDetailsWithoutExceptionMessage()
    {
        await using var app = await BuildProblemDetailsAppAsync();
        using var client = app.GetTestClient();

        using var response = await client.GetAsync("/unexpected");
        var rawBody = await response.Content.ReadAsStringAsync();
        using var body = JsonDocument.Parse(rawBody);

        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.InternalServerError);
        await Assert.That(body.RootElement.GetProperty("title").GetString()).IsEqualTo("An unexpected error occurred.");
        await Assert.That(body.RootElement.GetProperty("code").GetString()).IsEqualTo("UnexpectedError");
        await Assert.That(body.RootElement.TryGetProperty("traceId", out _)).IsTrue();
        await Assert.That(rawBody).DoesNotContain("raw provider secret");
    }

    [Test]
    public async Task StatusCodePages_ReturnsProblemDetailsForEmptyNotFound()
    {
        await using var app = await BuildProblemDetailsAppAsync();
        using var client = app.GetTestClient();

        using var response = await client.GetAsync("/missing");
        using var body = await ReadProblemDetailsAsync(response);

        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.NotFound);
        await Assert.That(body.RootElement.GetProperty("title").GetString()).IsEqualTo("Not Found");
        await Assert.That(body.RootElement.GetProperty("status").GetInt32()).IsEqualTo(StatusCodes.Status404NotFound);
        await Assert.That(body.RootElement.GetProperty("code").GetString()).IsEqualTo("Http404");
        await Assert.That(body.RootElement.TryGetProperty("traceId", out _)).IsTrue();
    }

    [Test]
    public async Task CsrfFailure_ReturnsProblemDetailsContract()
    {
        await using var app = await BuildCsrfAppAsync();
        using var client = app.GetTestClient();

        using var response = await client.PostAsync("/mutate", content: null);
        using var body = await ReadProblemDetailsAsync(response);

        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.BadRequest);
        await Assert.That(body.RootElement.GetProperty("title").GetString()).IsEqualTo("CSRF validation failed.");
        await Assert.That(body.RootElement.GetProperty("code").GetString()).IsEqualTo("CsrfValidationFailed");
        await Assert.That(body.RootElement.GetProperty("module").GetString()).IsEqualTo("auth");
        await Assert.That(body.RootElement.GetProperty("feature").GetString()).IsEqualTo("csrf");
        await Assert.That(body.RootElement.GetProperty("reason").GetString()).IsEqualTo("MissingOrInvalidToken");
        await Assert.That(body.RootElement.TryGetProperty("traceId", out _)).IsTrue();
    }

    private static async Task<WebApplication> BuildProblemDetailsAppAsync()
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseTestServer();
        builder.Services.AddRouting();
        builder.Services.AddNexoProblemDetails();

        var app = builder.Build();
        app.UseExceptionHandler();
        app.UseStatusCodePages();
        app.MapGet("/known", IResult () =>
        {
            throw new NexoHttpException(
                StatusCodes.Status409Conflict,
                "RestaurantReservationConflict",
                "Reservation conflict.",
                "The requested table is not available for the selected time.",
                module: "restaurant",
                feature: "reservations",
                reason: "Conflict");
        });
        app.MapGet("/unexpected", IResult () => throw new InvalidOperationException("raw provider secret should not leak"));
        app.MapGet("/missing", () => Results.NotFound());

        await app.StartAsync();
        return app;
    }

    private static async Task<WebApplication> BuildCsrfAppAsync()
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseTestServer();
        builder.Services.AddRouting();
        builder.Services.AddNexoProblemDetails();

        var app = builder.Build();
        app.UseNexoCsrfProtection();
        app.MapPost("/mutate", () => Results.NoContent());

        await app.StartAsync();
        return app;
    }

    private static async Task<JsonDocument> ReadProblemDetailsAsync(HttpResponseMessage response)
    {
        await Assert.That(response.Content.Headers.ContentType?.MediaType).IsEqualTo("application/problem+json");
        var rawBody = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(rawBody);
    }
}
