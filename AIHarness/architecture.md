# Nexo Architecture

This is the architecture reference for agents. `AGENTS.md` is the normative
root guide; this file explains module boundaries and runtime shape.

## Runtime Shape

Nexo is a .NET Aspire modular monolith:

```text
frontend (React + Vite)
  -> Nexo.Server (FastEndpoints API)
       resolves active organization context, validates membership, permissions, and
       active modules, then executes the feature slice
  -> PostgreSQL + external Keycloak + external providers
```

`Nexo.AppHost` orchestrates PostgreSQL, `Nexo.Server`, and the frontend for the
local runtime. Redis-backed caching is deferred until a domain cache strategy is
approved. Keycloak is configured as an external identity provider until a local
identity resource is added. `Nexo.Server` hosts all modules behind one API
surface. There is no worker or queue tier in the current shape.

## Project Responsibilities

| Project | Responsibility |
| --- | --- |
| `Nexo.AppHost` | Aspire orchestration for PostgreSQL, `Nexo.Server`, and `frontend`; Keycloak configuration is external today, and Redis is intentionally disabled. |
| `Nexo.Server` | FastEndpoints API, vertical-slice modules, `NexoDbContext`, tenant/module/permission resolution, DI, health checks, and telemetry wiring. |
| `frontend` | React + Vite + TypeScript SPA served through `frontend.esproj`; consumes `/v1/...` endpoints and mirrors module/permission gating for UX. |
| `Nexo.Shared` | Contract-only DTO and enum project shared across server and generated client surfaces; it must not contain EF, ASP.NET, provider SDK, or business workflow logic. |

Extract shared projects only when a boundary becomes load-bearing. Do not
create empty shared projects in advance.

## Module Layout

Vertical slices live under:

```text
Nexo.Server/Modules/<Module>/Features/<UseCase>/
```

A mature module may use:

```text
Nexo.Server/Modules/<Module>/
  Abstractions/
  Data/
    Configurations/
    Extensions/
  Features/
  Integrations/
```

Namespaces should mirror folder segments.

## Dependency Direction

Planned direction as the modular layout solidifies:

```text
Feature endpoint/handler
  -> module abstractions and persistence
  -> integration implementation
  -> external provider
```

Business workflows must not reference provider SDKs directly. Provider details
belong behind ports and integration implementations.

## Non-Negotiable Checks

- Modular monolith for the MVP; no microservice split.
- FastEndpoints only; no MVC controllers.
- Mediator only; no MediatR.
- EF Core directly through `NexoDbContext`; no generic repositories or custom
  Unit of Work.
- Organization isolation through `organization_id` and EF Core global query filters.
- PostgreSQL schemas are per module, never per organization.
- Backend module activation checks are required for gated features.
- No agent-applied migrations.
- No raw secrets in repository files or credential rows.

## Review Questions

- Does the change respect module boundaries and vertical-slice placement?
- Does it preserve organization isolation?
- Does it enforce backend module activation and permission checks where needed?
- Are provider details behind ports?
- Are tests and docs proportionate to the risk?
