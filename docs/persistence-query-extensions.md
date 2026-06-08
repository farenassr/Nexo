# Persistence Query Extensions

Use persistence query extensions for reusable EF Core query shapes that belong
to entity access, not feature orchestration.

Suggested locations:

- `Nexo.Server/Modules/<Module>/Data/Extensions`
- `Nexo.Server/Modules/<Module>/Persistence/Extensions`
- `Nexo.Infrastructure.Persistence` once a shared persistence project is
  justified

Namespaces should mirror folder segments.

## Use For

- company and branch scoping
- active module checks
- membership, role, and permission lookups
- calendar availability queries
- restaurant reservation availability queries
- common includes tied to persistence entities

## Rules

- Return `IQueryable<TEntity>` for composable database queries.
- Keep feature decisions, DTO construction, and provider calls out of query
  extensions.
- Keep explicit `company_id` predicates for company-owned reads even when
  global query filters apply.
- Use `IgnoreQueryFilters()` only in narrowly named helpers that immediately
  re-apply required company and aggregate predicates.
- Keep `AsNoTracking()` at the call site unless a helper exists only for a
  clearly read-only query shape.
- Do not add repositories, generic repositories, or custom Unit of Work
  abstractions.

Provider SDK response shaping belongs in integration implementations, not in
the persistence layer.
