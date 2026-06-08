# Harness Engineering

This is the index for Nexo's repeatable agent workflow: which docs to read,
which checks to run, and which project subagents exist.

## Harness Doc Index

| Document | Use when |
| --- | --- |
| `AIHarness/harness-engineering.md` | Choosing harness scripts, checks, subagents, or reliability work. |
| `AIHarness/architecture.md` | Changing module boundaries, project references, vertical slices, or runtime topology. |
| `AIHarness/integration-model.md` | Changing integration ports, providers, credentials, Keycloak, or sync/webhook behavior. |
| `AIHarness/security-rules.md` | Changing secrets, authentication, authorization, webhooks, company isolation, module gating, or logging. |
| `docs/data-model.md` | Changing schemas, entities, relationships, JSONB mappings, or multi-tenant data design. |

## Checks

Run focused checks first, then broaden when risk warrants it.

| Script | Purpose |
| --- | --- |
| `AIHarness/scripts/doc-gardening.ps1` | Checks Markdown links, stale instruction references, scratch-doc references, and this harness index. |
| `AIHarness/scripts/architecture-check.ps1` | Checks project references, no MediatR, no MVC controllers, provider SDK isolation, `/v1` routes, TimeProvider usage, and module namespace alignment. |
| `AIHarness/scripts/harness-check.ps1` | Runs doc gardening and architecture checks. Optional switches broaden to format, build, or tests. |
| `AIHarness/scripts/build.ps1` | Restores and builds the solution through the project wrapper. |
| `AIHarness/scripts/test.ps1` | Runs solution tests through the project wrapper. |
| `AIHarness/scripts/format.ps1` | Runs formatting through the project wrapper. |
| `AIHarness/scripts/review-current-branch.ps1` | Generates review context for branch-diff review. |
| `AIHarness/scripts/aspire-smoke.ps1` | Optional local runtime smoke check for AppHost and API health. |

Use `AIHarness/scripts/aspire-smoke.ps1 -StartAppHost` only when runtime
confidence is needed. For code-only or doc-only changes, prefer static checks.

## Project Subagents

Project-scoped Codex agents live in `.codex/agents/`:

- `codebase-scout`
- `architecture-reviewer`
- `backend-engineer`
- `frontend-engineer`
- `db-specialist`
- `testing-engineer`
- `code-simplifier`

Use only the agents that match the task. Do not add new agents until a workflow
repeats enough to justify one.

## Harness Backlog

- Map harness scripts to CI jobs once CI is added.
- Add recurring doc-gardening once automations are available.
- Add provider contract fixtures after the first external provider is selected.
