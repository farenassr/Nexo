# Cloud And Local Infrastructure

This document captures infrastructure decisions that are not specific to one
module.

## Local Development

- Use `Nexo.AppHost` to start PostgreSQL, `Nexo.Server`, and `frontend`.
  Redis is intentionally not published until a cache strategy is approved.
- Aspire resource references and `.WithReference(...)` supply local runtime
  connection strings.
- Local user-secrets or Aspire parameters may hold development-only values such
  as design-time EF credentials or Keycloak client ids.
- Keycloak is currently external to AppHost. Store non-sensitive realm metadata
  in `Nexo.Server/appsettings.json`, local `Keycloak:ClientId` in
  `Nexo.Server` user-secrets or an equivalent configuration source. Add a local
  identity resource only with an explicit runtime decision and matching
  bootstrap docs.
- Agents must not run `dotnet ef database update`.

## Shared Or Deployed Environments

- Store provider credentials, webhook secrets, confidential Keycloak client
  secrets if introduced, and API keys in a managed secret store once the
  deployment target is selected.
- Database rows store credential references such as `kv://...`, never raw
  secret values.
- Do not move local PostgreSQL connection strings into a secret store when
  Aspire already supplies them.
- For deployed environments, prefer the hosting platform's service bindings or
  managed identity patterns where available.

## Harness Checks

- Use `AIHarness/scripts/harness-check.ps1` for static harness validation.
- Use `AIHarness/scripts/aspire-smoke.ps1 -StartAppHost` only when local
  runtime health needs verification.
