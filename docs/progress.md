# Current progress and next-chat handoff

## Current state

- Private [mikegauci/opslens](https://github.com/mikegauci/opslens) created under the verified account; committed planning baseline pushed to `main`.
- Milestones M0–M6, planned labels/topics and [15 backlog issues](https://github.com/mikegauci/opslens/issues) created. Multi-milestone items use their first milestone; PLAN-15 is optional after core release. No separate board is needed yet.
- PLAN-01 ([PR #16](https://github.com/mikegauci/opslens/pull/16), [#1](https://github.com/mikegauci/opslens/issues/1)): [screen notes](screen-notes.md) define the investigation, shadcn/ui patterns, initial tokens, filter/date semantics, evidence presentation and essential states.
- React screens, API, database, CI, AI integration and deployments have not been built. Figma is excluded.
- One fresh Codex chat per PR; pushing and merging after required checks are authorized. This PR updates documentation only; verify its merge before beginning PLAN-02.

## Verification

- GitHub account, private visibility, baseline push and the created issue/milestone/label mapping verified through authenticated access.
- Local Markdown links and documentation whitespace checked; screen notes reviewed against the metric contract, build plan and copilot plan.
- GitHub currently returns `allow_auto_merge: false` even after an enable request; `main` has no branch protection. Use the authorized direct-merge fallback after checking PR status. Ruleset inspection returns GitHub's private-repository upgrade requirement (HTTP 403); preserve the private setting and available controls. No CI exists yet.
- No application tests, browser review, accessibility audit or live AI evaluations have run. Foundation establishes real checks; do not add dummy CI for this document change.

## Next work

[PLAN-02 / #2](https://github.com/mikegauci/opslens/issues/2): establish the pnpm workspace, preview spike and CI. Read its full acceptance criteria in [the backlog](github-backlog.md). Prove a frontend route, API response, database query and streaming response on the chosen runtime; record hosting tradeoffs and working setup. Use the brief screen notes, not another design document.

Start in a fresh chat under Github Projects, using `gpt-6.1-sol` with medium reasoning, from verified merged `main`. Read AGENTS.md, this file, build-plan.md and the relevant backlog item; consult other documents as needed. Complete one small PR, update this handoff, push, auto-merge after checks, verify the actual merge, then continue sequentially in another fresh chat within the user's authorized build scope. Never run concurrent edits against this checkout.
