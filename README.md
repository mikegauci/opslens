# OpsLens

**An iGaming operations dashboard with an evidence-backed AI copilot.**

OpsLens helps an operations analyst spot a change in revenue, inspect the transactions behind it, and interpret the result using documented metric definitions and investigation guides.

This is an independent portfolio project using fictional brands and synthetic data. It is not affiliated with BetForge.

## Status

Foundation stage. A React diagnostic route, typed Hono API, real PostgreSQL connectivity probe, streamed response and CI are implemented. Dashboards, seeded analytics, AI, Storybook and hosted deployments are still future work. See [working setup and hosting tradeoffs](docs/runtime.md).

The build prioritises a polished, explainable result over a fixed deadline. It uses React and TypeScript throughout the frontend; Angular is excluded.

## Planned experience

- An overview with four metrics, two linked charts, and meaningful period comparisons.
- An activity explorer with server filtering, incremental loading, a virtualised table, and transaction details.
- An operations copilot that combines retrieved documentation with validated analytics queries and cites its evidence.
- A shared component package documented in Storybook.
- A reproducible Superset dashboard used to check the React replacement.

## Start here

1. [Build plan](docs/build-plan.md): scope, architecture, milestones, and release criteria.
2. [GitHub backlog](docs/github-backlog.md): repository setup and issue-ready acceptance criteria.
3. [Metric contract](docs/metric-contract.md): definitions, date handling, and edge cases.
4. [AI copilot plan](docs/ai-copilot.md): RAG, analytics tools, and evaluations.
5. [Screen notes](docs/screen-notes.md): investigation flow, scope and essential states.
6. [Agent guidance](AGENTS.md): working conventions for this repository.

## Intended stack

React, TypeScript, Vite, Tailwind CSS, shadcn/ui, ECharts, TanStack Table/Virtual/Query, a small TypeScript API, PostgreSQL, OpenAPI-generated clients, Vitest, Playwright, Storybook, and OpenAI through the AI SDK.

Node 24, pnpm and the installed foundation dependencies are pinned with a committed lockfile. Start with [the local setup](docs/runtime.md); `pnpm check` runs lint, types, domain/API tests, contract drift, production build and browser smoke against PostgreSQL.

## Portfolio deliverables

The final repository will link to the live demo, Storybook, Superset comparison, evaluation report, and a short walkthrough. Those links will be added as each deliverable exists. Design will be developed directly in React from brief screen notes; a separate Figma file is excluded.
