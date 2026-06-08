# Nexo Plans

Use this file as the index for implementation plans, harness proposals,
completed work, technical debt, and decision history.

## Active Plans

| Plan | Status | Owner | Notes |
| --- | --- | --- | --- |
| Harness reliability pass | Active | Agents | Add architecture lints, doc gardening, and local observability scripts that match Nexo's modular layout. |
| MVP backend completion | Active | Agents | Build out Core, IAM, Calendar, and Restaurant vertical slices on top of the current Aspire + FastEndpoints template. Track active backend work in issues or new focused plans here. |

## Completed Plans

| Plan | Completed | Evidence |
| --- | --- | --- |
| Foundation harness scaffold | 2026-06-03 | Root `AGENTS.md`, `AIHarness/`, `AIHarness/scripts/`, and project subagents exist. |
| Harness rewrite for Nexo | 2026-06-08 | `README.md`, `AGENTS.md`, `.codex/` overlay and subagents, `AIHarness/` docs and scripts, and `docs/` rewritten to describe Nexo (modular SaaS for companies/branches/modules) instead of the previously copied CeoAgent/WhatsApp/React Native content. |

## Technical Debt

| Debt | Impact | Next step |
| --- | --- | --- |
| Harness scripts are not mapped to CI jobs | Agents can run checks locally, but merge gates are not visible in repo docs. | Add CI documentation or workflows when the pipeline is finalized. |
| Aspire smoke loop is opt-in | Runtime observability is available but not part of default harness checks. | Use `AIHarness/scripts/aspire-smoke.ps1 -StartAppHost` for runtime-sensitive changes. |
| `docs/data-model.md` describes the planned domain, not yet-implemented tables | The backend is still at template stage; the documented schema is a target, not current state. | Update the doc as `core`/`iam`/`calendar`/`restaurant` entities and migrations land. |

## Decision Log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-06-03 | Treat `AGENTS.md` as the single normative root guide. | The previously referenced historical guide file does not exist. |
| 2026-06-03 | Keep the old prompt template ignored as scratch material. | Prevent conflicting task-start instructions from entering agent context. |
| 2026-06-03 | Enforce architecture rules with scripts and tests. | Convert repo rules into repeatable checks instead of relying on agent memory. |
| 2026-06-04 | Keep GitHub Actions workflows empty for now. | Local harness scripts remain the preferred validation path until a pipeline is chosen. |
| 2026-06-08 | Replace the copied CeoAgent/WhatsApp/React Native harness content with Nexo-specific guidance, keeping the FastEndpoints/Mediator/EF Core/TUnit/Modular-Monolith/Vertical-Slice decisions. | The repo's docs and `.codex`/`AIHarness` assets described an unrelated project; Nexo needed its own normative guide aligned to its actual stack and domain (companies, branches, IAM, modules, restaurant/clinic/retail). |
