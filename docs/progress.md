# Current progress and next-chat handoff

Keep this file brief and update it with each PR. Describe only work and verification that actually happened.

## Current state

- Local planning repository created on `main`.
- Build plan, metric contract, AI plan, 15-item backlog, agent guidance and GitHub templates saved.
- Separate Figma deliverable removed at the user's request; develop the design directly in React from brief screen notes.
- Required workflow saved: one fresh Codex chat per new PR; push and auto-merge after required checks, without another approval request.
- Application code, database, CI, AI integration and deployments have not been built.
- GitHub remote and issues have not been created. The last GitHub CLI authentication check reported an invalid sign-in; verify access when remote setup is requested.

## Verification so far

- Planning-document local links checked.
- GitHub issue template parsed successfully.
- Documentation changes checked for whitespace errors.
- No application tests or live AI evaluations have run.

## Next planned work

PLAN-01: write a brief investigation flow and screen outline. Then PLAN-02 establishes the workspace and an API-backed metric. Implementation has not yet been requested; these are next planned items, not instructions to start the entire backlog.

## New-chat prompt format

Work in `/Users/michaelgauci/GitHub/opslens` on [one requested PLAN item]. Read AGENTS.md, docs/build-plan.md, docs/github-backlog.md and docs/progress.md, then read only the additional documents needed for this item. Follow its acceptance criteria, validate the result, update progress, push, open the PR and auto-merge after required checks pass. Verify the merge. Use a separate new chat for any subsequent PR within the user's authorized scope.
