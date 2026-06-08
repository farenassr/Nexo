# Security Rules

This is the security checklist for agents.

## Secrets

Never commit:

- API keys
- provider access tokens
- webhook secrets
- refresh tokens
- passwords
- Keycloak client secrets
- signing keys
- raw connection strings

Database credential rows store references such as `kv://...`, never secret
values.

## Authentication And Authorization

- Keycloak is the identity provider.
- The API validates JWTs and resolves the internal user through
  `keycloak_user_id` mapped to the token `sub` claim.
- Keycloak owns the company/organization identity. `company_id` is the
  external Keycloak organization id, not a Nexo-generated id.
- Nexo owns branches, memberships, roles, permissions, active modules, business
  rules, and audit records scoped to that external `company_id`.
- Authorization checks must run for every company-owned request. Never trust
  the client for tenant, module, role, or permission scope.

## Multi-Tenancy

- Every company-owned table includes `company_id`.
- Company-owned queries rely on EF Core global query filters.
- Public requests must not supply authoritative `company_id` values.
- Resolve inbound integration events to a company through stored integration or
  credential mappings, not client-supplied identifiers.

## Module Gating

- A company can use only modules active in `core.company_modules`.
- Backend module activation checks are mandatory for gated features.
- Frontend gating is only a UX convenience.
- Role/permission checks and module checks are separate; both must pass when a
  feature requires both.

## Webhooks

- Verify provider signatures before processing.
- Use constant-time comparison for HMAC signatures.
- Apply idempotency and replay protection.
- Return quickly and defer long work.
- Do not log raw webhook payloads by default.
- Avoid logging signature prefixes, raw query strings, remote IP addresses,
  user agents, or provider response bodies on noisy provider paths.

## Logging

Allowed by default:

- correlation IDs
- company IDs
- branch IDs
- internal user IDs
- module and feature names
- provider names
- status and failure reason codes

Avoid by default:

- raw customer or staff PII
- access tokens, refresh tokens, or JWTs
- Keycloak client secrets or admin credentials
- raw webhook/provider payloads
- raw integration request or response bodies containing PII
- provider secrets
