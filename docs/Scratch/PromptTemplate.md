# Harness-Engineered Development Prompt Template

Use this template to start a scoped development phase.

## Phase Goal

Describe the goal in one or two concrete sentences.

## Rules

- Follow `AGENTS.md`.
- Read `.codex/AGENTS.md` only for Codex-specific overlay rules.
- Read `AIHarness/` docs only when relevant to the change.
- Prefer `AIHarness/scripts/` over ad hoc commands.
- Use relevant `.codex/agents/` subagents only when they add value.
- Keep changes small, scoped, reversible, and production-safe.
- Do not refactor unrelated code.
- Do not revert unrelated user changes.
- Do not scaffold, remove, or apply EF migrations unless explicitly requested.
- Update relevant docs when behavior, contracts, or boundaries change.

## Workflow

1. Read `AGENTS.md`.
2. Check `git status --short`.
3. Inspect relevant code, tests, scripts, and docs.
4. Clarify only questions that materially change scope, architecture,
   contracts, security, migration strategy, user-visible behavior, or
   verification.
5. Produce a concise plan before editing.
6. Implement only the approved scope.
7. Run the narrowest meaningful validation.
8. Report changed files, commands run, pass/fail results, and anything not
   verified.

## Optional Subagents

Use only the agents that match the task:

- `codebase-scout`
- `architecture-reviewer`
- `backend-engineer`
- `frontend-engineer`
- `db-specialist`
- `testing-engineer`
- `code-simplifier`

Each selected subagent should return:

- risks
- relevant files
- recommended changes
- tests or docs to update
- what should not change

## Plan Shape

Before editing, provide:

1. phase summary
2. key inspection findings
3. assumptions
4. blocking questions, if any
5. implementation steps
6. likely files to change
7. validation commands
8. risks and open questions
