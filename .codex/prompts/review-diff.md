# Codex Diff Review Prompt

Use this prompt for ordinary current-branch reviews.

Review only the current diff against `AGENTS.md` and any relevant `AIHarness/`
docs. Read unchanged files only when needed to understand the modified code.

Lead with findings, ordered by severity. Each finding must include a file/line
reference, the risk, and the recommended fix. Prioritize correctness, security,
company isolation, integration boundaries, missing tests, and production
reliability.

If there are no actionable findings, say so directly and note any remaining
test or verification gaps.
