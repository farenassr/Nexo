# Nexo Data Model

This document describes the database model that is implemented in the current
Nexo codebase. It should not present future modules as existing persistence.

Nexo is a multi-tenant SaaS backend organized by module. Persisted tenant-owned
rows include `organization_id`, and `NexoDbContext` applies EF Core global query
filters for the current organization.

## Implementation Status

| Area | Schema | Status | Tables |
| --- | --- | --- | --- |
| Core | `core` | Implemented | `branches` |
| Restaurant | `restaurant` | Implemented | `floors`, `areas`, `tables`, `opening_hours`, `special_days`, `customers`, `reservations`, `reservation_tables`, `reservation_status_history`, `table_blocks`, `floor_plans`, `area_layouts`, `table_layouts`, `table_seat_layouts` |
| Shared auth | none | Implemented without local auth tables | Keycloak BFF routes, protected session cookie, CSRF middleware, token refresh, minimal `/auth/me` session contract |
| IAM | `iam` | Planned | Users, memberships, roles, permissions |
| Calendar | `calendar` | Planned | Events, availability, blocks |
| Integrations | `integrations` | Planned | Providers, organization integrations, webhooks, sync jobs |
| Audit | `audit` | Planned | Audit entries |

Clinic, retail, payments, notifications, reporting, and AI assistant workflows
remain future modules. When they are implemented, they should follow the same
schema-per-module pattern and should not introduce tenant-specific schemas.

## Identifiers And Tenancy

Internal entity IDs are GUID v7 values generated with `Guid.CreateVersion7()`.

`organization_id` is the tenant isolation key. The current EF model stores it
as a `Guid` on every implemented tenant-owned entity. Runtime requests resolve
it from the authenticated Keycloak `organization` claim. Nexo does not accept
organization scope from application settings. Do not add a local
`organizations` table to fill that gap without an explicit design decision.

Use schemas per module:

```text
core.branches
restaurant.reservations
restaurant.floor_plans
restaurant.table_layouts
```

Do not use schemas or databases per organization:

```text
tenant_acme.reservations
tenant_demo.reservations
```

## Shared Columns

Tenant-owned tables include:

| Column | Purpose |
| --- | --- |
| `organization_id` | Tenant isolation key used by EF Core global query filters. |
| `created_at` | UTC creation timestamp. |
| `updated_at` | UTC update timestamp. |

`reservation_tables` is the only implemented organization-owned join table without
`updated_at`; it stores `created_at` with the composite key.

Use `TimeProvider` in services when stamping persisted timestamps. Do not call
`DateTime.Now` or `DateTime.UtcNow` directly.

## Persistence And Migrations

`NexoDbContext` currently maps Core and Restaurant entities. The local
development initializer calls `Database.EnsureCreatedAsync()`. Tenant-scoped
sample data is skipped when no authenticated organization context is available.

There are no EF migrations in the current implementation. When migration work is
explicitly requested, migrations must:

- call `migrationBuilder.EnsureSchema(...)` for required schemas;
- keep the migrations history table in `core.__ef_migrations_history`;
- preserve organization-owned indexes and query-filter assumptions.

Agents should not scaffold, remove, apply, or run EF migrations unless the user
explicitly requests migration work.

## `core`

There is no `core.organizations` table.

| Table | Purpose | Key columns |
| --- | --- | --- |
| `branches` | Organization branches or locations. | `id`, `organization_id`, `name`, `address`, `time_zone`, `is_active`, `created_at`, `updated_at` |

Indexes:

- `organization_id`, `is_active`
- `organization_id`, `name`

## `restaurant`

The Restaurant module is the active MVP vertical. It owns setup, availability,
dashboard, reservations, table blocks, and floor-plan layout persistence.

### Setup Tables

| Table | Purpose | Key columns |
| --- | --- | --- |
| `floors` | Dining rooms or physical floor groupings for a branch. | `id`, `organization_id`, `branch_id`, `name`, `sort_order`, `is_active`, `created_at`, `updated_at` |
| `areas` | Areas within a floor, such as dining room or patio. | `id`, `organization_id`, `branch_id`, `floor_id`, `name`, `type`, `sort_order`, `is_active`, `created_at`, `updated_at` |
| `tables` | Reservable tables within a branch and floor. | `id`, `organization_id`, `branch_id`, `floor_id`, `area_id`, `label`, `min_capacity`, `max_capacity`, `default_reservation_minutes`, `shape`, `is_active`, `created_at`, `updated_at` |
| `opening_hours` | Normal weekly opening hours per branch. | `id`, `organization_id`, `branch_id`, `day_of_week`, `opens_at`, `closes_at`, `is_closed`, `created_at`, `updated_at` |
| `special_days` | Date-specific branch opening overrides. | `id`, `organization_id`, `branch_id`, `date`, `name`, `is_closed`, `opens_at`, `closes_at`, `created_at`, `updated_at` |

Relationships:

- `floors.branch_id` references `core.branches`.
- `areas.branch_id` references `core.branches`; `areas.floor_id` references
  `restaurant.floors`.
- `tables.branch_id` references `core.branches`; `tables.floor_id` references
  `restaurant.floors`; `tables.area_id` optionally references
  `restaurant.areas`.
- `opening_hours.branch_id` and `special_days.branch_id` reference
  `core.branches`.

### Reservation Tables

| Table | Purpose | Key columns |
| --- | --- | --- |
| `customers` | Restaurant customer records. | `id`, `organization_id`, `full_name`, `phone`, `email`, `notes`, `created_at`, `updated_at` |
| `reservations` | Reservation header and status. | `id`, `organization_id`, `branch_id`, `customer_id`, `party_size`, `start_at`, `end_at`, `turnover_buffer_minutes`, `status`, `source`, `special_requests`, `created_by_app_user_id`, `cancelled_at`, `cancellation_reason`, `created_at`, `updated_at` |
| `reservation_tables` | Many-to-many assignment between reservations and tables. | `organization_id`, `reservation_id`, `table_id`, `created_at` |
| `reservation_status_history` | Reservation status transition history. | `id`, `organization_id`, `reservation_id`, `from_status`, `to_status`, `reason`, `changed_by_app_user_id`, `changed_at` |
| `table_blocks` | Branch, floor, area, or table-level time blocks. | `id`, `organization_id`, `branch_id`, `floor_id`, `area_id`, `table_id`, `start_at`, `end_at`, `reason`, `is_active`, `created_at`, `updated_at` |

Relationships:

- `reservations.branch_id` references `core.branches`.
- `reservations.customer_id` references `restaurant.customers`.
- `reservation_tables` has composite primary key
  `(reservation_id, table_id)`.
- `reservation_tables.reservation_id` cascades from `restaurant.reservations`.
- `reservation_tables.table_id` references `restaurant.tables`.
- `reservation_status_history.reservation_id` cascades from
  `restaurant.reservations`.
- `table_blocks.branch_id` references `core.branches`; optional `floor_id`,
  `area_id`, and `table_id` reference Restaurant setup tables.

### Floor-Plan Layout Tables

| Table | Purpose | Key columns |
| --- | --- | --- |
| `floor_plans` | Named floor-plan canvas per branch and floor. | `id`, `organization_id`, `branch_id`, `floor_id`, `name`, `canvas_width`, `canvas_height`, `grid_size`, `is_active`, `created_at`, `updated_at` |
| `area_layouts` | Area rectangles on a floor-plan canvas. | `id`, `organization_id`, `floor_plan_id`, `area_id`, `x`, `y`, `width`, `height`, `rotation_degrees`, `z_index`, `created_at`, `updated_at` |
| `table_layouts` | Table placement on a floor-plan canvas. | `id`, `organization_id`, `floor_plan_id`, `table_id`, `x`, `y`, `width`, `height`, `rotation_degrees`, `shape`, `z_index`, `created_at`, `updated_at` |
| `table_seat_layouts` | Seat positions attached to a table layout. | `id`, `organization_id`, `table_layout_id`, `seat_number`, `x`, `y`, `rotation_degrees`, `created_at`, `updated_at` |

Relationships:

- `floor_plans.branch_id` references `core.branches`.
- `floor_plans.floor_id` references `restaurant.floors`.
- `area_layouts.floor_plan_id` cascades from `restaurant.floor_plans`.
- `area_layouts.area_id` references `restaurant.areas`.
- `table_layouts.floor_plan_id` cascades from `restaurant.floor_plans`.
- `table_layouts.table_id` references `restaurant.tables`.
- `table_seat_layouts.table_layout_id` cascades from
  `restaurant.table_layouts`.

## Planned Schemas

The following schemas are architectural targets, not implemented persistence:

| Schema | Planned responsibility |
| --- | --- |
| `iam` | Keycloak user mapping, organization memberships, roles, permissions, and branch-scoped access. |
| `calendar` | Shared calendar events, availability windows, and blocks reused by vertical modules. |
| `integrations` | Provider catalog, organization integration configuration, credential references, webhook ingestion, and sync jobs. |
| `audit` | Important user and system actions, stored without raw customer/staff PII, tokens, prompts, or secrets. |

When integrations are implemented, credential rows must store references such
as `kv://organization/provider/purpose`, never raw secrets.
