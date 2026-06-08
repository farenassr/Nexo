# Cloud And Local Infrastructure

This document captures infrastructure decisions that are not specific to one
module.

## Local Development

- Use `Nexo.AppHost` to start PostgreSQL, Redis, Keycloak, `Nexo.Server`, and
  `frontend`.
- Aspire resource references and `.WithReference(...)` supply local runtime
  connection strings.
- Local user-secrets or Aspire parameters may hold development-only values such
  as design-time EF credentials or Keycloak test configuration.
- Agents must not run `dotnet ef database update`.

## Shared Or Deployed Environments

- Store provider credentials, webhook secrets, Keycloak client secrets, and API
  keys in a managed secret store once the deployment target is selected.
- Database rows store credential references such as `kv://...`, never raw
  secret values.
- Do not move local PostgreSQL, Redis, or Keycloak connection strings into a
  secret store when Aspire already supplies them.
- For deployed environments, prefer the hosting platform's service bindings or
  managed identity patterns where available.

## Harness Checks

- Use `AIHarness/scripts/harness-check.ps1` for static harness validation.
- Use `AIHarness/scripts/aspire-smoke.ps1 -StartAppHost` only when local
  runtime health needs verification.
