# Branch Diff Review Prompt

Use this prompt to produce a Markdown review report for the current branch.

Create the report under `docs/CODE_REVIEW/`. Do not change source code.

## Review Scope

Review only the current branch diff against its base branch. Use `git diff` or
the project harness script that generates review context. Read unchanged files
only when needed to understand contracts, patterns, or impact.

Do not perform a full repository audit unless explicitly requested.

## Required Context

1. Read `AGENTS.md`.
2. Check `git status --short`.
3. Determine the base branch and inspect the diff.
4. Read relevant `AIHarness/` docs only when the diff touches that domain.
5. Prefer `AIHarness/scripts/` wrappers for validation.

Use relevant `.codex/agents/` subagents only when they add value. For complex
diffs, start with `codebase-scout`, then use only the specialist reviewers that
match the changed areas.

## Review Priorities

Prioritize findings in these areas:

- correctness and production reliability
- security and secret handling
- company isolation and module gating
- integration boundaries and provider isolation
- persistence, migrations, and query behavior
- concurrency and async safety
- performance and scalability
- observability and error handling
- test coverage and maintainability

Report only actionable issues introduced, worsened, or exposed by the current
branch. Mention pre-existing issues only when they materially affect the diff.

## Output Format

Write the report in Markdown with these sections:

```markdown
# Code Review Report

## Summary

- Overall assessment:
- Risk level:
- Files reviewed:
- Validation run:

## Findings

### P1: <title>

- File/line:
- Problem:
- Impact:
- Recommendation:
- Tests or verification:

## Test Gaps

## Open Questions

## Findings Index

| # | Severity | Finding | Section |
| --- | --- | --- | --- |
```

If there are no actionable findings, state that clearly and still include test
gaps or verification limits.
