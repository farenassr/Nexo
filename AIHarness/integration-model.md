# Integration Model

This document defines how external systems enter Nexo.

## Boundary Rule

Business logic talks to ports. Provider-specific code lives behind integration
implementations.

```text
Feature workflow
  -> module or shared abstraction
  -> provider implementation
  -> external provider
```

Put port interfaces and provider-neutral request/result records in a module's
`Abstractions` folder, or in a shared abstractions project once extracted.
Put provider-specific runtime code in `Integrations/<ProviderName>/`.

## Planned Ports

The backend is still early. Confirm current names and locations before relying
on a specific API.

| Port | Owner | Purpose |
| --- | --- | --- |
| Identity/session resolution | `Iam` | Validate Keycloak JWTs and resolve `keycloak_user_id` to `iam.app_users`. |
| Calendar provider integration | `Calendar` or `Integrations` | Availability, booking, sync, and cancellation with an external calendar provider. |
| Messaging/notification channel | `Integrations` | Provider-neutral outbound notifications. WhatsApp is a roadmap candidate. |
| Provider catalog/configuration | `Integrations` | Provider catalog, company configuration, webhook events, and sync jobs. |

## Implementation Rules

- Keep provider SDKs and typed HTTP clients inside integration implementation
  folders.
- Use typed HTTP clients when useful; use raw `HttpClient` only for provider
  needs that do not fit a typed client.
- Keep one implementation per port until a second provider requires keyed DI.
- Company provider selection belongs in `integrations.company_integrations`,
  not in hardcoded business branches.
- Verify webhook signatures and enforce idempotency before inbound events reach
  business workflows.

## Credentials

- Credential rows store references, not secret values.
- Use reference values such as `kv://company/provider/purpose`.
- Local development uses Aspire parameters or user-secrets for credentials not
  supplied by Aspire resource references.
- Do not move local PostgreSQL connection strings into a secret store when
  Aspire already supplies them. Redis is not part of the current AppHost
  runtime and should only be reintroduced with an approved cache strategy. Keep
  non-sensitive Keycloak realm metadata in appsettings and `Keycloak:ClientId`
  in `Nexo.Server` user-secrets or an equivalent environment-specific
  configuration source.

## Contract Test Checklist

When adding or changing a provider implementation, cover:

- provider and port under test
- happy path
- provider error
- timeout/retry expectation
- idempotency expectation
- secret handling expectation
- webhook signature verification
