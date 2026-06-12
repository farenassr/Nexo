# Nexo

Nexo is a modular, multi-tenant SaaS platform for small and mid-sized
businesses that still run daily operations through spreadsheets, chat, paper,
or informal coordination.

The first product vertical is restaurants. The architecture is intentionally
designed so the same core platform can later support clinics, retail, services,
and other operational businesses without changing the tenancy model.

## Product Goal

Nexo is being built as one operating layer for a company to manage:

- branches and locations
- authenticated browser sessions through a Keycloak BFF flow
- users, memberships, roles, permissions, and active business modules
- vertical-specific operations such as restaurant floors, tables, customers,
  and reservations
- external integrations and sync jobs

For the MVP, restaurant is the active vertical. The implemented backend model
currently covers Core branches, Keycloak BFF authentication, development
organization/module/permission gates, and Restaurant setup, reservations,
availability, dashboard, table blocks, and floor-plan layouts. IAM, calendar,
integrations, audit, clinic, retail, payments, notifications, reporting, and AI
assistant workflows are future modules.

## Architecture

Nexo is a .NET Aspire modular monolith:

```text
frontend (React + Vite + TypeScript)
  -> Nexo.Server (FastEndpoints API)
       serves the Keycloak BFF auth routes, resolves organization context, validates
       development module/permission gates, then executes vertical-slice
       features
  -> PostgreSQL + Redis + external Keycloak + external integrations
```

Main projects:

- `Nexo.AppHost`: local Aspire orchestration for PostgreSQL, Redis, API, and
  frontend. Keycloak is not orchestrated locally; AppHost forwards external
  Keycloak configuration into `Nexo.Server`.
- `Nexo.Server`: FastEndpoints API, EF Core persistence, module registration,
  Keycloak BFF authentication, and vertical slices under `Modules/<Module>/`.
- `frontend`: React + Vite + TypeScript SPA served through Aspire.

See `AIHarness/architecture.md` for the architecture reference used by agents.

## Stack

```text
Backend:        .NET, FastEndpoints, Mediator, EF Core
Orchestration:  .NET Aspire
Frontend:       React, Vite, TypeScript, Tailwind CSS, TanStack Router,
                TanStack Query
Database:       PostgreSQL
Cache:          Redis
Identity:       External Keycloak through server-side BFF cookies
Testing:        TUnit, Shouldly, NSubstitute, Verify, Testcontainers,
                Aspire Testing
Tenancy:        organization_id on tenant-owned rows, with authenticated organization context
Database model: PostgreSQL schemas per module, not per organization
```

## Tenancy

Nexo is tenant-isolated by Keycloak organization. Nexo does not create an
internal `organizations` table.

Tenant-owned rows include `organization_id`, and EF Core global query filters
enforce organization isolation. The current implementation stores
`organization_id` as a `Guid`, resolves it from the authenticated Keycloak
`organization` claim, and fails closed when a protected request does not have a
valid organization id. Local development does not configure a synthetic
organization id.

Implemented database shape:

```text
core.branches
restaurant.reservations
restaurant.floor_plans
restaurant.table_layouts
```

Avoided shape:

```text
tenant_acme.reservations
tenant_demo.reservations
```

Keycloak BFF authentication is implemented in `Nexo.Server` under `/auth/*`.
Real IAM membership and persisted module gating are still open implementation
items. Do not introduce an internal organization table
to fill that gap without an explicit design decision.

## Current API Surface

Implemented routes are grouped around:

- `/auth/login`, `/auth/me`, `/auth/refresh`, and `/auth/logout` for the
  Keycloak BFF session flow.
- `/v1/restaurant/context`, setup, dashboard, availability, reservations,
  table-block, and floor-plan endpoints for the Restaurant MVP.

In non-development environments, `/v1/restaurant/context` is filtered out of
FastEndpoints registration.

## Local Development

Prefer the harness wrappers:

```powershell
./AIHarness/scripts/build.ps1
./AIHarness/scripts/test.ps1
./AIHarness/scripts/harness-check.ps1
```

Canonical commands:

```powershell
dotnet restore Nexo.slnx
dotnet build Nexo.slnx --no-restore
dotnet test Nexo.slnx --no-build
```

Use `Nexo.AppHost` for the Aspire local runtime. It starts PostgreSQL, Redis,
`Nexo.Server`, and the Vite frontend, then publishes the frontend into the
server container output.

Keycloak is external to AppHost. Non-sensitive realm metadata lives in
`Nexo.Server/appsettings.json`. Configure the public client id through
`Nexo.Server` user-secrets:

```powershell
dotnet user-secrets set --project .\Nexo.Server "Keycloak:ClientId" "ceo-agent-web"
```

See `docs/AUTH/KEYCLOAK_BFF_AUTH.md` for auth setup and
`docs/azure-infrastructure.md` for local and deployed infrastructure notes.

## Documentation Map

- `AGENTS.md`: canonical rules for agents working in this repository.
- `.codex/AGENTS.md`: Codex-specific overlay.
- `AIHarness/harness-engineering.md`: harness scripts, checks, and subagents.
- `AIHarness/architecture.md`: module boundaries and runtime shape.
- `AIHarness/integration-model.md`: integration ports and provider rules.
- `AIHarness/security-rules.md`: secrets, auth, tenancy, webhooks, and logging.
- `docs/data-model.md`: implemented database model and planned schemas.
- `docs/database_schema.drawio`: implemented Core and Restaurant persistence
  diagram.
- `docs/AUTH/KEYCLOAK_BFF_AUTH.md`: Keycloak BFF flow and configuration.
- `docs/persistence-query-extensions.md`: reusable EF Core query guidance.
