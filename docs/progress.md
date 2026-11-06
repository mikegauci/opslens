# Current progress and next-chat handoff

## Current state

- Private [mikegauci/opslens](https://github.com/mikegauci/opslens), milestones M0–M6 and all 15 issues exist. PLAN-01 merged in [PR #16](https://github.com/mikegauci/opslens/pull/16).
- PLAN-02 ([PR #17](https://github.com/mikegauci/opslens/pull/17), [#2](https://github.com/mikegauci/opslens/issues/2)): pnpm web/API/UI/contracts/analytics workspace, exact dependencies and lockfile; React `/foundation`; Hono Node API; real PostgreSQL `SELECT 1`; finite diagnostic SSE; generated OpenAPI/types/client; CI for lint/types/domain/API/contracts/build/browser smoke.
- [Runtime/setup](runtime.md) records the same-origin Node 24 choice and Sites/Vercel tradeoffs. Node is proven locally; cloud deployment/ingress is **not** verified. No resources were provisioned. The UI package contains only a foundation shell; shadcn components/Storybook await concrete reuse.
- Seeded data, analytics endpoints, dashboards and live AI remain future work. Diagnostic money output is a fixed example, not a reported dataset metric. Figma stays excluded.

## Verification

- Frozen installation and `pnpm peers check` pass. Biome, TypeScript, 9 Vitest domain/API tests and production web/API builds pass.
- Three production browser checks pass locally with installed Chrome 156 against isolated Homebrew PostgreSQL 17.11: UI/API/database/stream, unavailable/retry recovery, and first HTTP chunk before completion. Current bundled Playwright Chromium does not support this Mac's macOS 13; Linux CI has also passed the same full gate with pinned Chromium against its PostgreSQL service.
- Contract regeneration matches tracked artifacts; a deliberate temporary schema mismatch was rejected by the drift gate and then restored.
- Desktop/mobile screenshots reviewed; [initial baseline](foundation-baseline.json) captures actual conditions and timings. No 10k/100k, hosted latency, manual screen-reader or live AI result is claimed.
- [Development evidence](development-evidence.md) records peer-version corrections, pnpm policy correction and the SSE-header bug caught by tests. Self-reviewed; no peer/team adoption claim.
- GitHub auto-merge is disabled; use direct merge only after successful checks. Private repository rulesets/branch protection previously required an account upgrade; preserve available checks and private visibility. Verify this PR's actual merge before continuing.

## Next work

[PLAN-03 / #3](https://github.com/mikegauci/opslens/issues/3): deterministic 10k/100k generator, manifest/hash, independently reviewed small golden fixtures, repeatable PostgreSQL migrations/seeds, and restricted application query grants. Read the full acceptance criteria in [the backlog](github-backlog.md), the [metric contract](metric-contract.md) and actual [runtime setup](runtime.md). Keep fixture expected values independent of production calculation code. Do not implement PLAN-04 in the same PR/chat.

Use a fresh chat under Github Projects with `gpt-6.1-sol`, medium reasoning, from verified merged main. Read AGENTS.md, this file, build-plan.md and PLAN-03. Complete one reviewable PR, update this handoff, push, wait for CI and use the authorized direct-merge fallback; verify the merge. Continue sequentially in another fresh chat within the authorized build scope; never edit this checkout concurrently.
