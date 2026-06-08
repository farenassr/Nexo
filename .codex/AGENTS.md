# Nexo Codex Overlay

Keep this file short. The canonical project rules live in `../AGENTS.md`.
Read that file first for architecture, security, database, integration,
multi-tenancy, command, commit, and completion rules.

## Codex Assets

- `.codex/config.toml`: Codex concurrency configuration.
- `.codex/agents/*.toml`: project-scoped Codex subagents.
- `.codex/prompts/*.md`: reusable Codex task prompts.

## Subagents

- Prefer read-only subagents for scouting and review.
- Avoid concurrent workspace-write agents on the same module.
- Reference `../AGENTS.md` in subagent prompts instead of restating shared
  project rules.
