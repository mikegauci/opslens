# OpsLens

**An iGaming operations dashboard with an evidence-backed AI copilot.**

OpsLens helps an operations analyst spot a change in revenue, inspect the transactions behind it, and interpret the result using documented metric definitions and investigation guides.

This is an independent portfolio project using fictional brands and synthetic data. It is not affiliated with BetForge.

## Status

Planning stage. The application, API, AI integration, Storybook, and deployments have not been built. No performance or evaluation results are claimed yet.

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
5. [Agent guidance](AGENTS.md): working conventions for this repository.

## Intended stack

React, TypeScript, Vite, Tailwind CSS, shadcn/ui, ECharts, TanStack Table/Virtual/Query, a small TypeScript API, PostgreSQL, OpenAPI-generated clients, Vitest, Playwright, Storybook, and OpenAI through the AI SDK.

Exact dependency versions and deployment adapters will be verified and pinned during the foundation milestone. Setup commands will be documented when they actually work.

## Portfolio deliverables

The final repository will link to the live demo, Storybook, Figma design, Superset comparison, evaluation report, and a short walkthrough. Those links will be added as each deliverable exists.
