# OpsLens build plan

Prepared 6 November 2026. Planning decisions are proposals until validated by the first implementation milestone.

## Outcome

Create one coherent, high-quality case study demonstrating React/TypeScript delivery, a reusable shadcn/ui design system, data visualisation at realistic volume, typed APIs, accessible interactions, testing, effective AI development guidance, and a useful AI product feature.

The user prioritises a solid, enticing, interview-ready result over a deadline. Progress is measured by working milestones and evidence, rather than a promised number of hours. The project strengthens an application; employment history still establishes production tenure and experience across teams.

The user has excluded a separate Figma deliverable to avoid duplicating design work and spending tokens on it. Use brief screen notes, established shadcn/ui patterns, and browser review of the working React interface. Do not create a Figma counterpart later unless the user requests it.

## Product story

An operations analyst sees that gross gaming revenue changed compared with the previous complete period. They identify which fictional provider contributed most, open the corresponding transactions, and ask the copilot how the metric is defined and what to investigate next.

The answer shows the comparison periods, verified figures, source documents, and a link back to the filtered explorer. It describes contributions supported by the data and treats possible explanations as hypotheses.

Seed one deliberate provider payout spike so this flow has a discoverable, reproducible story. Include ordinary variation, pending transactions, voids, and zero-activity periods.

## Scope

### Overview

- Four initial cards: settled stakes, settled payouts, GGR, and active settled players.
- Daily GGR trend and provider contribution to the change between equal periods.
- Date, brand, and provider filters, persisted in the URL.
- Chart interactions that open the exact matching activity slice.
- Visible reporting timezone, data timestamp, and synthetic-data label.
- First-class loading, empty, stale, error, and retry states.

### Activity explorer

- Server-side filtering, allow-listed sorting, bounded pages, and incremental loading.
- A virtualised semantic table, with a paginated accessible view if virtualisation prevents reliable assistive-technology access.
- Transaction details in a keyboard-accessible drawer with correct focus restoration.
- An explicit date basis so placement dates are not confused with settlement dates.
- Shareable URLs and correct browser back/forward behaviour.

### Contextual copilot

- A side panel opened from either screen, with the active filter scope visible.
- Suggested questions tied to the current view.
- Answers grounded in metric definitions and investigation runbooks through retrieval.
- Read-only analytics tools using the same calculation service as the dashboards.
- Clickable citations, data-evidence cards, and links into the explorer.
- Streaming, cancellation, useful errors, uncertainty, and a clearly labelled recorded demonstration when live AI is unavailable.

### Shared UI

Create a small package for MetricCard, ChartPanel, FilterBar, StatusBadge, and AsyncState as reuse becomes concrete. Add an accessible source/evidence presentation if it is useful across the copilot. Keep transaction-domain logic in the app.

Storybook should show component states, tokens, keyboard behaviour, and two different compositions. Two compositions demonstrate reuse; they are not evidence of adoption by separate teams.

### Superset comparison

Build an actual small Superset baseline from the same seeded data and metric definitions. Save its export, SQL, screenshots, version, and instructions. Recreate its four metrics and two charts in React, documenting matching totals and intentional interaction improvements.

Superset runs locally for this exercise. It is not a runtime dependency for the public demo. Exports must not include connection credentials.

### Deliberate limits

Keep v1 to this workflow. Authentication, billing, multi-tenancy, real wagers, real player data, streaming event ingestion, user-uploaded documents, autonomous actions, and a general-purpose dashboard builder are outside v1. A large migration framework is unnecessary for the core case study.

## Architecture

Use one pnpm workspace repository, without a monorepo orchestration tool initially.

```text
opslens/
  apps/
    web/                  React + TypeScript + Vite
    api/                  TypeScript HTTP API and server-only AI integration
  packages/
    ui/                   Shared shadcn/ui-based components + Storybook
    contracts/            OpenAPI schema and generated client/types
    analytics/            Metric/filter contracts and server calculation code
  data/
    fixtures/             Small, hand-verifiable expected-value fixtures
    generated/            Ignored larger exports; generated from a fixed seed
    manifest.json         Seed, schema version, reporting window, dataset hash
  knowledge/              Versioned, original metric definitions and runbooks
  evals/                  Questions, expected evidence, graders, recorded runs
  supabase/               Local database configuration and committed migrations
  superset/               Baseline SQL, sanitised exports, screenshots, setup notes
  tests/e2e/              Critical browser journeys
  docs/                   Decisions, designs, benchmarks, review evidence
  .agents/skills/         Reusable development skills, created during the build
  .github/               Issue templates, PR template, and CI workflows
```

Only the planning documents and templates exist at this stage. The directory tree describes the intended implementation.

| Layer | Proposed choice | Purpose |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite | Directly demonstrate the requested frontend skills |
| UI | Tailwind CSS, shadcn/ui, semantic tokens | Build a small coherent component system |
| Charts | ECharts | Linked charts, drill-down, useful descriptions and data alternatives |
| Table and fetching | TanStack Table, Virtual, Query | Separate state, rendering, and server data concerns |
| API | Hono with Zod/OpenAPI integration | Small typed API with runtime input validation |
| Client | openapi-typescript and openapi-fetch | Generated request/response types rather than handwritten duplicates |
| Database | PostgreSQL; local development with Supabase, hosted Supabase proposed | Real server-side filtering and aggregation over 100,000 rows |
| AI | AI SDK with OpenAI Responses-compatible provider | Streaming, typed tool calls, and React integration |
| Retrieval | OpenAI hosted File Search over versioned project documents | Demonstrate RAG without operating an additional vector database |
| Quality | Vitest, Testing Library, Playwright, axe, Storybook | Domain correctness, interactions, accessibility, and end-to-end behaviour |

Keep SQL/data credentials behind the API. Use a restricted read-only database role for application analytics and a separate role for migrations and seeding. Review access grants and RLS for any exposed Supabase schemas. Use a serverless-compatible connection path and measure representative query plans before adding indexes.

The frontend consumes the typed API. UI and AI tools call the same validated analytics service. Superset independently queries the same seed dataset so it provides a useful reconciliation check.

### Deployment decision

The first technical spike must prove a frontend route, an API endpoint, a database query, and a streamed response on the intended hosting runtime before substantial feature work.

Prefer a same-origin deployment so `/api` and the app share a release and URL. Sites is the available default hosting workflow; confirm its source/build/runtime adapter for this Vite/API workspace. Vercel Services is a documented alternative for deploying the frontend and API together, but is currently Beta and should be evaluated in the spike rather than assumed. Record the selected approach and its tradeoffs before writing deployment configuration. No hosting resources are provisioned by this planning step.

## Delivery milestones

| Milestone | Deliverable | Exit condition |
| --- | --- | --- |
| M0: Product and design | Brief screen notes, primary user flow, metric contract, source/AI interaction outline | The investigation and essential states are clear enough to begin implementation |
| M1: Foundation | Workspace, preview spike, CI, initial agent instructions, local database seed, generated client | Fresh checkout can run; a real API-backed metric works and CI checks it |
| M2: Analytics baseline | Fixed-seed 100k dataset, API queries, Superset baseline and golden fixtures | Independent calculations agree for normal and edge-case filter slices |
| M3: React experience | Overview, explorer, URL filters, chart drill-down, virtualisation, extracted UI package | The complete non-AI investigation works with keyboard and browser navigation |
| M4: Copilot | Curated knowledge corpus, retrieval, tools, streaming UI, citations and evaluations | Numerical claims and cited evidence pass the documented evaluation gate |
| M5: Engineering evidence | Storybook, reusable development skills used on actual changes, peer review, performance report | Recorded evidence shows reuse, judgement, corrections and validated improvements |
| M6: Portfolio release | Public-review-ready repository, demo, Storybook, case study and short video | Fresh reviewer can understand, run, inspect, and demonstrate the project |

CI, tests, accessibility, design review, and AI-development evidence start during M1 and continue through all milestones. They are not end-of-project tasks. Begin initial agent guidance at M1, improve it based on observed problems, and demonstrate the resulting reusable skill in M5.

The skill-driven feature should add hold percentage after the four baseline metrics. Preserve a before/after record showing its contract, tests, component reuse, documentation, and human review.

## Quality gates

### Deterministic application behaviour

- Small golden fixtures give exact answers for eligibility, minor-unit currency, negative GGR, zero denominators, timezone boundaries, missing comparisons, and period contribution totals.
- API tests reject invalid dates, unknown filters, unsupported sort keys, and oversized page sizes.
- Browser tests cover overview-to-explorer drill-down, shared URL reload, browser history, retry after failure, details drawer focus, and copilot evidence links.
- Meaningful axe checks plus manual keyboard and screen-reader review cover the critical journey. Automated accessibility checks alone are insufficient.
- Production builds are profiled at 10k and 100k rows. Record hardware, browser, network, server region, warm/cold conditions, transfer size, memory, query latency and visible interaction timings. Define budgets from the M1 baseline and require an explicit explanation for regressions; do not invent performance claims in advance.

### AI behaviour

Use at least 30 human-reviewed cases spanning retrieval-only questions, analytical comparisons, combined questions, missing evidence, ambiguous dates, conflicting or stale documents, injected instructions, invalid tool requests, zero denominators, and provider failures.

Critical numerical/tool-schema/isolation checks require every case to pass. Set an initial overall grounded-answer target of at least 90% on a held-out subset and require citations for all substantive document-based claims. Manually review every unsupported confident claim; do not hide such failures in an aggregate score. These are proposed release criteria, not results.

Record source recall/precision for retrieval cases, numeric correctness, citation support, appropriate uncertainty, time to first visible response, end-to-end latency, and actual usage/cost. Normal CI uses mocks; live evaluation runs are deliberate and produce versioned reports without secrets.

### Demo operation

- The dashboard remains usable without an OpenAI key.
- Recorded AI answers are explicitly labelled and cannot be mistaken for live model responses.
- Credentials remain server-side; live calls have bounded input, output, tool steps, timeouts, cancellation, and persistent global/request quotas.
- No public arbitrary-SQL endpoint, database mutations from the copilot, or unrestricted retrieval uploads exist.
- Failure and quota states preserve the user's context and show a useful next action.

## GitHub and review

Use a dedicated `opslens` repository. `mikegauci` is the proposed owner inferred from an existing local repository; verify the authenticated owner when creating the remote. Start private while building, then make the finished repository and demo available for portfolio review when requested.

Use `main`, small feature branches, linked issues, and a simple board: Backlog, Ready, In progress, Review, Done. Keep one active implementation issue at a time unless independent work is useful. PRs should describe the behaviour and verification, and include relevant screenshots and AI-assisted decisions. Apply required status checks once working CI exists and the account supports them. Do not require an unavailable second reviewer.

Seek at least one genuine peer review and one developer trial of a reusable skill. If a reviewer is unavailable, describe the work as self-reviewed and the skill as personally used. Do not manufacture team-adoption evidence.

The GitHub CLI currently reports an invalid sign-in. This planning step prepares a local repository; remote creation, issues, labels, and milestones are pending a working sign-in. The connected GitHub plugin has issue/PR operations but does not expose repository creation.

## Optional migration evidence

After the core release gate, replace one static HTML legacy screen with React behind a route-level flag, keeping the data contract and deep links stable. Demonstrate parity tests and rollback. Label it as a small migration demonstration, not a large production migration. No Angular is needed.

## Final application package

- Clear README with real demo, Storybook and walkthrough links.
- Three-minute demonstration of the seeded investigation and cited copilot response.
- Short case study explaining the problem, chosen approach, tradeoffs, measured outcomes and limitations.
- Sanitised Superset-before/React-after comparison with matching metric results.
- Actual benchmark, accessibility, AI-evaluation, peer-review and AI-workflow evidence.
- Interview notes explaining the main architectural decisions, one AI mistake corrected, one performance finding, one design challenge, and the project's limits.

## Hiring-criteria evidence map

| Role requirement | Planned evidence | Boundary |
| --- | --- | --- |
| React and TypeScript | Working two-screen frontend, typed state, generated API client and reviewed changes | Employment history establishes years and production tenure |
| Shared component library | UI package, Storybook, documented contracts and multiple compositions | A solo project does not establish adoption by other teams |
| Advanced AI-assisted delivery | Actual development examples, corrections, review and reproducible validation | Product AI and AI-assisted engineering are separate evidence tracks |
| Skills and agent guidance used by a team | Versioned instructions, skills used on real changes, optional peer pilot | Describe a pilot accurately and never imply wider adoption |
| shadcn/ui and Tailwind | Coherent tokens, component variants and custom reusable components | Installing a starter alone is insufficient evidence |
| Visualisation and real data volumes | Linked ECharts charts, 100k server-backed dataset and measured performance | Synthetic records demonstrate realistic volume, not live production traffic |
| Accessibility and testing | Critical-flow tests, manual assistive-technology review, documented fixes | Automation alone does not establish full accessibility |
| Design judgement | Working React screens, browser review and short notes explaining flow improvements | Figma-specific work is excluded and is not claimed as project evidence |
| Superset or BI familiarity | Actual baseline dashboard and reconciled React replacement | This is a focused replacement exercise, not a complete BI platform |
| Virtualised tables | Server-backed TanStack explorer with measured rendering and transfer costs | Virtualisation does not replace server data operations |
| iGaming or support-tool familiarity | Explicit metric definitions, transaction states and operational investigation | The project does not replace industry employment experience |
| Framework migrations | Optional static-HTML-to-React replacement with parity and rollback | A small demonstration does not establish large production migration experience |

## Sources checked for the plan

- [BetForge product context](https://betforge.ai/qa-with-joseph-about-betforge/).
- [shadcn/ui Vite setup](https://ui.shadcn.com/docs/installation/vite).
- [TanStack Table/Virtual separation](https://tanstack.com/table/latest/docs/framework/react/guide/virtualization).
- [OpenAPI-generated fetch client](https://openapi-ts.dev/openapi-fetch/).
- [Storybook for React and Vite](https://storybook.js.org/docs/get-started/frameworks/react-vite).
- [OpenAI File Search](https://developers.openai.com/api/docs/guides/tools-file-search).
- [OpenAI function calling](https://developers.openai.com/api/docs/guides/function-calling).
- [OpenAI evaluation guidance](https://developers.openai.com/api/docs/guides/evaluation-best-practices).
- [AI SDK OpenAI provider](https://ai-sdk.dev/providers/ai-sdk-providers/openai).
- [Supabase connection pooling](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits).
- [Superset first dashboard](https://superset.apache.org/user-docs/using-superset/creating-your-first-dashboard/).
- [GitHub Projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects).
- [Vercel Services and its current Beta status](https://vercel.com/docs/services).
