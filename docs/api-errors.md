# API Error Contract

Nexo uses RFC 7807 Problem Details for HTTP API errors. Server-wide exception
handling is registered with `AddNexoProblemDetails()`, `AddExceptionHandler<T>()`,
`AddProblemDetails()`, `UseExceptionHandler()`, and `UseStatusCodePages()`.

Problem responses include the standard fields plus stable extensions:

```json
{
  "type": "https://nexo.app/problems/restaurant-reservation-conflict",
  "title": "Reservation conflict.",
  "status": 409,
  "detail": "The requested table is not available for the selected time.",
  "code": "RestaurantReservationConflict",
  "traceId": "00-...",
  "module": "restaurant",
  "feature": "reservations",
  "reason": "Conflict"
}
```

Rules:

- Use `NexoHttpException` only for known, safe-to-return failures.
- Do not include raw PII, secrets, provider payloads, tokens, or exception text
  in `detail`.
- Unknown exceptions return `UnexpectedError` with no exception message in the
  response body.
- `traceId` is always included for support correlation.
- `module`, `feature`, and `reason` are optional but should be included when a
  failure belongs to a module-owned workflow.
- CSRF failures use this contract with code `CsrfValidationFailed`.

Existing Restaurant result-pattern responses still return
`RestaurantOperationErrorResponse` in some endpoints. Convert those endpoint
responses incrementally when touching the related workflow.
