# Nexo Data Model

This document describes the planned database model for Nexo. It is a target
model derived from the product direction, not a guarantee that all entities or
migrations already exist.

Update this document as modules and migrations are implemented.

## Model Overview

Nexo is a multi-tenant SaaS backend organized by module. Most rows that belong
to a company include `company_id`. PostgreSQL schemas are organized per module,
not per company.

| Area | Schema | Main tables | Purpose |
| --- | --- | --- | --- |
| Core | `core` | `branches`, `modules`, `company_modules` | Branches, module catalog, and active modules per company. There is no local `companies` table. |
| Identity and access | `iam` | `app_users`, `company_memberships`, `roles`, `permissions`, `role_permissions`, `user_roles` | Keycloak user mapping, memberships, roles, and permissions. |
| Calendar | `calendar` | `events`, `availabilities`, `blocks` | Shared calendar primitives used by vertical modules. |
| Restaurant | `restaurant` | `floors`, `tables`, `opening_hours`, `customers`, `reservations` | Restaurant-specific operations. |
| Integrations | `integrations` | `providers`, `company_integrations`, `webhook_events`, `sync_jobs` | Provider catalog, company configuration, inbound webhooks, and sync work. |
| Audit | `audit` | `audit_entries` | Traceability for important actions and changes. |

Clinic and retail should follow the same pattern when implemented: their own
schema, tenant-owned tables with `company_id`, and no tenant-specific schema.

## Identifiers

Internal entity IDs are GUID v7 values generated with `Guid.CreateVersion7()`.

`company_id` is the exception. It is the external Keycloak organization id. It
is not generated locally and is not replaced by an internal company row.

The MVP has not wired Keycloak end to end yet. Until that work lands, local
`company_id` resolution is an open implementation item. Do not add an internal
`companies` table without an explicit design decision.

## Shared Columns

Tenant-owned tables commonly include:

| Column | Purpose |
| --- | --- |
| `company_id` | External Keycloak organization id and tenant isolation key. |
| `created_at` | UTC creation timestamp stamped through `TimeProvider`. |
| `updated_at` | UTC update timestamp stamped through `TimeProvider`. |
| `xmin` | PostgreSQL optimistic concurrency token when mapped in EF Core. |

Do not use direct `DateTime.Now` or `DateTime.UtcNow` calls for persisted
timestamps.

## Schema Rules

Use schemas per module:

```text
core.branches
iam.company_memberships
calendar.events
restaurant.reservations
integrations.company_integrations
audit.audit_entries
```

Do not use schemas or databases per company:

```text
tenant_acme.reservations
tenant_demo.reservations
```

EF migrations must create required schemas with
`migrationBuilder.EnsureSchema(...)`. The migrations history table lives in
`core.__ef_migrations_history`.

## `core`

There is no `core.companies` table. Keycloak owns the company/organization.

| Table | Purpose | Key columns |
| --- | --- | --- |
| `branches` | Company branches or locations. | `id`, `company_id`, `name`, `address`, `time_zone` |
| `modules` | Global module catalog. | `id`, `key`, `name`, `description` |
| `company_modules` | Active modules per company. | `id`, `company_id`, `module_id`, `is_active`, `activated_at` |

`core.company_modules` is the source of truth for module gating. The backend
must enforce it; the frontend only mirrors it for navigation and UX.

## `iam`

| Table | Purpose | Key columns |
| --- | --- | --- |
| `app_users` | Internal user linked to Keycloak. | `id`, `keycloak_user_id`, `email`, `display_name` |
| `company_memberships` | User membership in a company and optionally branch. | `id`, `company_id`, `branch_id`, `app_user_id`, `status` |
| `roles` | Company-scoped or platform roles. | `id`, `company_id`, `name`, `description` |
| `permissions` | Permission catalog. | `id`, `key`, `description` |
| `role_permissions` | Role-permission join. | `role_id`, `permission_id` |
| `user_roles` | Membership-role join. | `company_membership_id`, `role_id` |

Business authorization is resolved from the active membership, not from a
client-supplied company id.

## `calendar`

| Table | Purpose | Key columns |
| --- | --- | --- |
| `events` | Generic calendar events. | `id`, `company_id`, `branch_id`, `title`, `starts_at`, `ends_at`, `owner_type`, `owner_id` |
| `availabilities` | Recurring or one-off availability windows. | `id`, `company_id`, `branch_id`, `subject_type`, `subject_id`, `day_of_week`, `starts_at`, `ends_at` |
| `blocks` | Time blocks such as holidays or maintenance. | `id`, `company_id`, `branch_id`, `starts_at`, `ends_at`, `reason` |

`owner_type`/`owner_id` and `subject_type`/`subject_id` allow vertical modules
to use the calendar without coupling it to one vertical.

## `restaurant`

| Table | Purpose | Key columns |
| --- | --- | --- |
| `floors` | Dining rooms or floor areas. | `id`, `company_id`, `branch_id`, `name` |
| `tables` | Tables within a floor. | `id`, `company_id`, `floor_id`, `label`, `seats` |
| `opening_hours` | Branch opening hours. | `id`, `company_id`, `branch_id`, `day_of_week`, `opens_at`, `closes_at` |
| `customers` | Restaurant customers. | `id`, `company_id`, `full_name`, `phone`, `email` |
| `reservations` | Table reservations. | `id`, `company_id`, `branch_id`, `table_id`, `customer_id`, `party_size`, `starts_at`, `ends_at`, `status` |

Reservations may link to `calendar.events` for a unified calendar view.

## `integrations`

| Table | Purpose | Key columns |
| --- | --- | --- |
| `providers` | Supported external providers. | `id`, `key`, `name`, `category` |
| `company_integrations` | Company-specific provider configuration. | `id`, `company_id`, `provider_id`, `credential_reference`, `configuration_json`, `is_active` |
| `webhook_events` | Idempotent inbound provider events. | `id`, `company_integration_id`, `external_event_id`, `received_at`, `processed_at`, `payload_json` |
| `sync_jobs` | Provider sync jobs. | `id`, `company_integration_id`, `status`, `started_at`, `finished_at`, `error` |

`credential_reference` stores values such as `kv://company/provider/purpose`.
It never stores raw secrets.

## `audit`

| Table | Purpose | Key columns |
| --- | --- | --- |
| `audit_entries` | Important actions and changes. | `id`, `company_id`, `actor_app_user_id`, `action`, `entity_type`, `entity_id`, `occurred_at`, `metadata_json` |

## JSONB

Use typed C# complex types for JSONB payloads instead of raw strings or
untyped dictionaries where the shape is known. Map them with EF Core JSON
mapping such as `ComplexProperty(...).ToJson(...)`.

Typical JSONB candidates:

- `company_integrations.configuration_json`
- `webhook_events.payload_json`
- `audit_entries.metadata_json`
