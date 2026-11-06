# GitHub setup and issue backlog

Private repository: [mikegauci/opslens](https://github.com/mikegauci/opslens). Milestones M0–M6, the planned labels and all 15 issues were created on 6 November 2026. PLAN IDs remain stable references; GitHub issue numbers are linked below. Issues spanning milestones use their first milestone; optional PLAN-15 remains outside the core release milestones.

## Repository setup

- Repository: `mikegauci/opslens`; account verified through the existing sign-in.
- Description: 'React operations analytics with accessible charts, a shared UI library, and an evidence-backed AI copilot.'
- Created private while building. Publish the finished portfolio repository when requested.
- Default branch: `main`. Use short feature branches and link PRs to their issues.
- Start each new PR in a fresh Codex chat with concise references to the plan, backlog item, AGENTS.md and docs/progress.md.
- Push and auto-merge authorized PRs after required checks pass; verify completion without requesting another user approval.
- Suggested topics: `react`, `typescript`, `shadcn-ui`, `data-visualization`, `rag`, `openai`, `playwright`, `storybook`.
- Milestones: M0 Product and design; M1 Foundation; M2 Analytics baseline; M3 React experience; M4 Copilot; M5 Engineering evidence; M6 Portfolio release.
- Labels: `product`, `design`, `frontend`, `api`, `data`, `ai`, `quality`, `documentation`, `infrastructure`, `optional`.
- Board columns: Backlog, Ready, In progress, Review, Done. Keep the board simple; issues and milestone views are enough if a separate Project adds overhead.
- Configure status checks after working CI exists. Check account/repository feature availability before requiring branch rules. A solo maintainer must not be blocked by an unavailable second reviewer.
- Select a license before the public release according to the user's preference.

## Initial issues

### PLAN-01 — Outline the investigation flow and screen structure

GitHub: [#1](https://github.com/mikegauci/opslens/issues/1).

Milestone: M0. Labels: product, design. Depends on: none.

- [ ] Record a brief outline of the overview, explorer, details drawer, and contextual copilot.
- [ ] Choose established shadcn/ui patterns and a small set of design tokens; refine the interface directly in React.
- [ ] Note essential decisions about negative GGR, absent comparisons, settlement versus placement dates, and filter scope.
- [ ] The primary investigation is clear enough to implement; review responsive, focus, loading, empty, error, stale, and source states in the browser as features are built.
- [ ] No separate Figma file or duplicate design artifact is required.

### PLAN-02 — Establish the workspace, preview spike and CI

GitHub: [#2](https://github.com/mikegauci/opslens/issues/2).

Milestone: M1. Labels: infrastructure, quality. Depends on: initial PLAN-01 decisions.

- [ ] Create pnpm workspaces for web, API, UI, contracts, and analytics; pin compatible versions and commit the lockfile.
- [ ] Prove one frontend route, API response, database query, and streaming response on the chosen runtime.
- [ ] Record the hosting choice and adapter tradeoffs, then document working local setup.
- [ ] CI performs relevant lint, type, domain, API, browser smoke, and production build checks as those capabilities become available.
- [ ] Generated API contracts are checked for drift; no dummy passing checks or CI badges.
- [ ] Capture initial performance conditions and establish initial agent-guidance conventions.

### PLAN-03 — Generate the dataset and establish independent metric fixtures

GitHub: [#3](https://github.com/mikegauci/opslens/issues/3).

Milestone: M1/M2. Labels: data, quality. Depends on: metric contract and PLAN-02.

- [ ] Generate repeatable 10k and 100k datasets over a fixed window with a manifest/hash.
- [ ] Include the provider payout spike, voids, pending rows, date boundaries, negative GGR and empty results.
- [ ] A small manually verified fixture establishes exact expected metrics.
- [ ] Migrations/seeds are repeatable in a clean local database; generated bulk data is ignored by Git.
- [ ] Restricted application access and any exposed-schema grants/RLS are reviewed.

### PLAN-04 — Implement the validated API and generated client

GitHub: [#4](https://github.com/mikegauci/opslens/issues/4).

Milestone: M1/M2. Labels: api, data, quality. Depends on: PLAN-02, PLAN-03.

- [ ] Summary, trend, contribution and activity endpoints implement the metric contract.
- [ ] Runtime validation rejects invalid dates, unknown IDs, bad sorting and oversized requests.
- [ ] Filtering, aggregation, sorting and paging run on the server with stable ordering.
- [ ] OpenAPI types/client are generated; cancellation and response errors have documented contracts.
- [ ] Query plans and representative latency are measured; UI and future AI tools share the server analytics service.

### PLAN-05 — Build the Superset baseline

GitHub: [#5](https://github.com/mikegauci/opslens/issues/5).

Milestone: M2. Labels: data, documentation. Depends on: PLAN-03.

- [ ] Run a pinned Superset setup locally and document a clean reproduction.
- [ ] Build the four cards and two charts with the same seed and definitions.
- [ ] Save sanitised configuration, independent SQL, screenshots and baseline filter results.
- [ ] Compare exact results with the hand-verifiable fixtures and API.
- [ ] No credentials or connection secrets appear in exported artifacts.

### PLAN-06 — Deliver the overview as a complete vertical slice

GitHub: [#6](https://github.com/mikegauci/opslens/issues/6).

Milestone: M3. Labels: frontend, design, quality. Depends on: PLAN-01, PLAN-04.

- [ ] Four metrics and two charts show correct values, units, periods and reporting timezone.
- [ ] Date/brand/provider filters survive reload and browser navigation through the URL.
- [ ] Chart interactions identify the corresponding explorer scope.
- [ ] Responsive, loading, empty, unavailable, retry and stale states work.
- [ ] Tests cover calculations through rendered behaviour and independent API fixtures; browser review checks the screen notes and primary investigation flow.

### PLAN-07 — Deliver the activity explorer and drill-down

GitHub: [#7](https://github.com/mikegauci/opslens/issues/7).

Milestone: M3. Labels: frontend, quality. Depends on: PLAN-04, PLAN-06.

- [ ] Server filtering/sorting and incremental loading work at 100k rows.
- [ ] TanStack Virtual limits rendering; transfer, memory and query behaviour are measured separately.
- [ ] Deep links preserve exact period, date basis, status, brand and provider filters.
- [ ] The details drawer restores focus correctly; stale queries cannot replace the current result.
- [ ] Keyboard/screen-reader access is verified, with an accessible paginated mode if needed.

### PLAN-08 — Extract and document the shared component library

GitHub: [#8](https://github.com/mikegauci/opslens/issues/8).

Milestone: M3/M5. Labels: frontend, design, documentation. Depends on: concrete reuse in PLAN-06/07.

- [ ] Move the small reusable component set into the UI package with typed, useful interfaces.
- [ ] Document tokens, variants, composition and loading/empty/error/keyboard states in Storybook.
- [ ] Show reuse across the two screens and a distinct Storybook composition.
- [ ] Shared components contain no accidental app-only API or transaction logic.
- [ ] A documented consumer workflow explains how another app would use and update the package.

### PLAN-09 — Curate the knowledge corpus and prove retrieval

GitHub: [#9](https://github.com/mikegauci/opslens/issues/9).

Milestone: M4. Labels: ai, documentation, quality. Depends on: stable metric definitions and PLAN-02.

- [ ] Write 12-20 concise original documents with IDs, effective dates, scopes and versions.
- [ ] Implement repeatable hosted File Search ingestion with a local-to-hosted manifest and duplicate-version handling.
- [ ] Verify actual retrieval results and citation metadata using the installed provider integration.
- [ ] Score source relevance on a human-reviewed retrieval set, including missing and conflicting documents.
- [ ] Missing credentials leave the normal dashboard usable and do not masquerade as live RAG.

### PLAN-10 — Build the contextual copilot and analytics tools

GitHub: [#10](https://github.com/mikegauci/opslens/issues/10).

Milestone: M4. Labels: ai, api, frontend. Depends on: PLAN-04, PLAN-06, PLAN-09.

- [ ] Read-only summary, comparison, contribution and activity-link tools validate scope and arguments.
- [ ] Numerical answers refer to actual tool evidence; document claims link to actual retrieved sources.
- [ ] The panel supports streaming, stop, retry, errors and explicit filter-scope changes.
- [ ] Source excerpts, evidence cards and valid explorer links work with keyboard navigation.
- [ ] The model has no arbitrary SQL, mutation, unrestricted URL or upload capability.

### PLAN-11 — Evaluate and harden the copilot

GitHub: [#11](https://github.com/mikegauci/opslens/issues/11).

Milestone: M4/M5. Labels: ai, quality. Depends on: PLAN-09, PLAN-10.

- [ ] Maintain 30+ reviewed cases with a reserved held-out subset and expected evidence.
- [ ] Test missing evidence, ambiguity, injected instructions, invalid tools, causal overclaims, cancellation and outages.
- [ ] Enforce input/output/tool/time bounds and persistent public-demo quotas.
- [ ] Publish actual numeric/citation/retrieval results, latency, token usage and cost; explain failures.
- [ ] Release gates in the AI plan pass; mocked CI and deliberate live evaluations are clearly distinguished.
- [ ] Recorded fallback content is labelled and bound to its original dataset scope.

### PLAN-12 — Demonstrate useful agent guidance and reusable skills

GitHub: [#12](https://github.com/mikegauci/opslens/issues/12).

Milestone: M5; evidence collection starts in M1. Labels: documentation, quality. Depends on: PLAN-02, PLAN-08 and real development experience.

- [ ] Refine AGENTS.md based on observed failures or repeated work.
- [ ] Build an add-dashboard-metric skill and a chart-review skill with concrete inputs, steps and validation.
- [ ] Use the metric skill to add hold percentage across the contract, API, UI, docs and tests.
- [ ] Record real accepted, corrected and rejected AI output, including how verification found issues.
- [ ] Ask a developer to try one skill and record their actual feedback if available; describe the adoption level accurately.

### PLAN-13 — Verify accessibility, performance and release behaviour

GitHub: [#13](https://github.com/mikegauci/opslens/issues/13).

Milestone: M5/M6; checks run throughout. Labels: quality, infrastructure. Depends on: PLAN-06 through PLAN-11.

- [ ] Critical browser journeys pass against a production build and the real API/database.
- [ ] Document automated accessibility checks plus manual keyboard and screen-reader findings/fixes.
- [ ] Compare 10k/100k performance under recorded hardware/network/server conditions.
- [ ] React results reconcile with the Superset baseline across representative filter slices.
- [ ] Verify deployment environment, errors, no-key behaviour, quota exhaustion and a clean checkout setup.
- [ ] Obtain genuine peer feedback if available and track resulting changes.

### PLAN-14 — Package the case study and portfolio release

GitHub: [#14](https://github.com/mikegauci/opslens/issues/14).

Milestone: M6. Labels: documentation, design. Depends on: PLAN-05, PLAN-08, PLAN-11 through PLAN-13.

- [ ] README links to the actual demo, Storybook, comparison and evaluation artifacts.
- [ ] Record a three-minute investigation walkthrough and concise architecture/tradeoff notes.
- [ ] Screenshots and case study describe measured outcomes with honest limits.
- [ ] Clean up secrets, placeholders, inactive links and unsupported claims; choose a license.
- [ ] Prepare interview explanations covering metrics, accessibility, data volume, RAG, AI judgement and component reuse.
- [ ] Make the intended repository/demo audience explicit at publication.

### PLAN-15 — Demonstrate incremental replacement without Angular

GitHub: [#15](https://github.com/mikegauci/opslens/issues/15).

Milestone: after core release. Labels: optional, frontend, quality. Depends on: PLAN-13.

- [ ] Replace one small static HTML legacy screen with React behind a route flag.
- [ ] Preserve deep links and the API contract; demonstrate parity checks and rollback.
- [ ] Explain what the exercise proves and what a large production migration would additionally require.

PLAN-01 notes: [Investigation flow and screen structure](screen-notes.md).

## Suggested first implementation sequence

PLAN-01 → PLAN-02 → PLAN-03 → PLAN-04 → PLAN-06. Build PLAN-05 after the data contract is stable, then complete PLAN-07/08. Proceed to the RAG/copilot work after the deterministic application works. Maintain tests and development evidence from the first code change.
