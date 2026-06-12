# Nexo Agent Guide

This file is the canonical guide for agents working in this repository.
Repository-specific instructions here override general agent preferences.

## Operating Model

Nexo uses harness engineering: work through repeatable planning,
implementation, review, and verification steps.

Before changing files:

1. Read this file.
2. Run `git status --short` and do not revert unrelated user changes.
3. Inspect the relevant implementation, tests, scripts, and docs.
4. Use `rg` or `rg --files` for search.
5. Read only the relevant harness docs:
   - `AIHarness/architecture.md` for module boundaries, project references,
     vertical slices, or runtime shape.
   - `AIHarness/integration-model.md` for ports, provider selection,
     Keycloak, calendar providers, or integrations.
   - `AIHarness/security-rules.md` for secrets, authentication,
     authorization, webhooks, logging, organization isolation, or PII.
   - `docs/data-model.md` for schemas, entities, relationships, and
     multi-tenant data design.
6. Make small, reversible changes.
7. Update tests, fixtures, or docs when behavior changes.
8. Run the narrowest meaningful validation.
9. Report what changed, what was verified, and what could not be verified.

Do not load the entire `AIHarness/` folder by default.

## Repository Shape

Nexo is a .NET Aspire modular monolith:

- `Nexo.AppHost`: local Aspire orchestration for PostgreSQL, Redis,
  `Nexo.Server`, and `frontend`. Keycloak is currently configured externally.
- `Nexo.Server`: FastEndpoints API surface. Vertical slices live under
  `Nexo.Server/Modules/<Module>/Features/<UseCase>/`.
- `frontend`: React + Vite + TypeScript SPA served through Aspire
  (`frontend.esproj`).
- `tests/*`: TUnit, Shouldly, NSubstitute, Verify, Testcontainers, and Aspire
  Testing as backend coverage grows.

As modules mature, propose focused project extraction only when a boundary is
load-bearing. Do not pre-create empty shared projects.

## Commands

Prefer wrappers:

```powershell
./AIHarness/scripts/build.ps1
./AIHarness/scripts/test.ps1
./AIHarness/scripts/format.ps1
./AIHarness/scripts/harness-check.ps1
```

Canonical commands:

```powershell
dotnet restore Nexo.slnx
dotnet build Nexo.slnx --no-restore
dotnet test Nexo.slnx --no-build
```

Focused test filters:

```powershell
dotnet test Nexo.slnx --filter "Core|Company|Branch"
dotnet test Nexo.slnx --filter "Iam|Membership|Role|Permission"
dotnet test Nexo.slnx --filter "Calendar|Availability"
dotnet test Nexo.slnx --filter "Restaurant|Table|Reservation"
```

Run the narrowest useful check first, then broaden when risk warrants it.

## Backend Rules

- Modular monolith first. Do not split MVP modules into microservices or
  separate databases.
- Use FastEndpoints. Do not add MVC controllers.
- Use martinothamar/Mediator for non-trivial workflows. Never use MediatR.
- Use Mapperly only when shapes diverge; direct construction is fine for
  simple mapping.
- Use EF Core directly through a single `NexoDbContext`. Do not add generic
  repositories or a custom Unit of Work.
- Organize reusable persistence filters and query shapes in `Persistence` or
  `Data/Extensions` folders. Avoid repeating filters in handlers.
- Apply module schemas through EF configuration and ensure migrations create
  schemas they depend on.
- Organization-owned data must include `organization_id` and use EF Core global query
  filters.
- Internal entity IDs use `Guid.CreateVersion7()`. `organization_id` is the
  Keycloak organization id and is not generated locally.
- Use `TimeProvider`; do not call `DateTime.Now` or `DateTime.UtcNow`
  directly.
- All API routes live under `/v1/` except `/health`, `/alive`, and BFF auth
  routes under `/auth/`.
- Keep `Program.cs` minimal; prefer module/service registration extensions.

## Frontend Rules

The frontend is a single-language React + Vite + TypeScript SPA. Do not add
i18n infrastructure unless explicitly requested.

Use the established stack by default:

- Tailwind CSS
- shadcn/ui and Radix UI primitives
- TanStack Router for routing
- TanStack Query for server state
- React Hook Form and Zod for forms and validation
- React state/context for local UI state

Add dependencies only when they solve a concrete problem:

- Lucide React for icons once an icon set is needed.
- Zustand only if React state/context becomes inadequate.
- Kubb only when the backend OpenAPI contract is stable enough for generated
  clients.

Frontend implementation rules:

- Do not add Keycloak or authorization wiring yet. Build screens as if an
  authenticated session will be provided later.
- Keep routes thin and put domain logic under `features/<module>/`.
- Mirror backend module boundaries in routes and navigation.
- Use centralized design tokens mapped to Tailwind/shadcn variables; avoid
  hardcoded colors, fonts, spacing, and radii in components.
- Use shadcn/Radix primitives before custom UI.
- Any async action button must show loading state, be disabled while running,
  prevent double submit, and return to the correct state afterward.
- Use localized loading states for in-screen actions; reserve full-page
  loading for true app bootstrap.
- Use `ErrorBoundary`, TanStack Query recovery, sonner toasts, and an API
  error normalizer for consistent error handling.
- Keep API calls typed and organized by feature/module. Do not scatter ad hoc
  `fetch` calls across components.

Preferred frontend layout:

```text
src/
  components/
    ui/
    common/
  features/
    <module>/
  hooks/
  lib/
    api/
    query/
    errors/
    utils/
  theme/
  types/
```

## Multi-Tenancy And Module Gating

- Tenancy is per organization through `organization_id` on every tenant-owned row.
- The organization is owned by Keycloak. Nexo has no internal
  `core.organizations` table.
- `organization_id` is resolved from the authenticated membership/session context.
  Never trust a public request body for organization scope.
- Database schemas are per module (`core`, `iam`, `calendar`, `restaurant`,
  `clinic`, `retail`, `integrations`, `audit`), never per organization.
- `core.organization_modules` is the source of truth for active modules.
- Backend module checks are mandatory. Frontend gating is only a UX
  convenience.
- Roles and permissions are scoped per organization and, where relevant, per
  branch.

## Integrations

- Business logic must talk to ports, not provider SDKs or external systems.
- Put ports in module-owned `Abstractions` folders or a shared abstractions
  project once extracted.
- Put provider-specific runtime code in `Integrations/<ProviderName>/`.
- Provider-neutral request/result models stay near the port.
- Aspire `.WithReference(...)` supplies local runtime connection strings for
  PostgreSQL and Redis. Keep non-sensitive Keycloak realm metadata in
  `Nexo.Server/appsettings.json`; keep `Keycloak:ClientId` in
  `Nexo.Server` user-secrets or an equivalent environment-specific
  configuration source.

## Database And Migrations

- Agents may inspect migrations and propose migration changes.
- Do not run `dotnet ef database update`.
- Do not scaffold, remove, or apply EF migrations unless the user explicitly
  requests migration work.
- Migrations must call `migrationBuilder.EnsureSchema(...)` for required
  schemas.
- The EF migrations history table is in the `core` schema:
  `__ef_migrations_history`.

## Security

- Never commit secrets, API keys, provider tokens, signing keys, refresh
  tokens, Keycloak client secrets, or connection strings.
- Integration credential rows store references such as `kv://...`, never raw
  secrets.
- Verify webhook signatures before processing.
- Webhook ingestion must be idempotent and return quickly.
- Do not log raw customer/staff PII, tokens, prompts, or secrets.

See `AIHarness/security-rules.md` for security-specific work.

## Subagents

Use project subagents when their domain matches the task:

- `codebase-scout`: initial context, relevant files, and current state.
- `architecture-reviewer`: boundaries, vertical slices, references, and risks.
- `backend-engineer`: .NET API, FastEndpoints, Mediator, handlers, services.
- `frontend-engineer`: React, routing, API integration, module-aware UI.
- `db-specialist`: EF Core, PostgreSQL, schemas, filters, indexes, migrations.
- `testing-engineer`: unit, integration, Aspire, Testcontainers, fixtures.
- `code-simplifier`: behavior-preserving simplification.

Use only relevant subagents. Do not dispatch every agent by default.

## Commit Messages

Use this format:

```text
<ProjectOrArea>/<ProjectOrArea>/...: [<GitHubIssueId>] <Concise change summary>
```

Example:

```text
Server/Core/Iam: [#14] Add company creation endpoint and membership bootstrap
```

## Completion

Before claiming work is complete:

1. Re-read the user request and this file.
2. Verify every changed file is intentional.
3. Run the narrowest relevant validation command.
4. Report exact commands and pass/fail results.
5. State anything that could not be verified.
