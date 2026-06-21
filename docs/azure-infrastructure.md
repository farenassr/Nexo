# Cloud And Local Infrastructure

This document captures infrastructure decisions that are not specific to one
module.

## Local Development

- Use `Nexo.AppHost` to start PostgreSQL, local Keycloak, `Nexo.Server`, and `frontend`.
  Redis is intentionally not published until a cache strategy is approved.
- Aspire resource references and `.WithReference(...)` supply local runtime
  connection strings.
- Local user-secrets or Aspire parameters may hold development-only values such
  as design-time EF credentials, the local Keycloak admin password, and local
  user passwords.
- Local Keycloak is an AppHost development resource only. It imports the
  versioned `Nexo.AppHost/keycloak/realms/nexo-realm.json` realm, injects
  `Keycloak__...` values into `Nexo.Server`, and is excluded from deployment
  manifests with `ExcludeFromManifest()`.
- Agents must not run `dotnet ef database update`.

## Shared Or Deployed Environments

- Do not publish the local Keycloak resource. Deployed environments must
  provide their identity provider through `Keycloak:Authority`,
  `Keycloak:Realm`, `Keycloak:ClientId`, and optionally
  `Keycloak:ScalarClientId` using environment configuration or a managed
  configuration store.
- Store provider credentials, webhook secrets, confidential OIDC client secrets
  if introduced, and API keys in a managed secret store once the deployment
  target is selected.
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
