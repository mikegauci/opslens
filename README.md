# OpsLens

**Investigate a weekly revenue change, from the first signal to the matching transactions.**

OpsLens is an independent iGaming frontend portfolio project with fictional brands and 100,000 deterministic synthetic transactions. The seeded investigation follows a GGR drop to Nova, opens the matching settled transactions, and uses a labelled recorded Copilot answer to explain Nova’s contribution.

| Review | Start here |
| --- | --- |
| Three-minute walkthrough | [MP4 recording](docs/portfolio/investigation.mp4) · [Transcript and click path](docs/portfolio/walkthrough.md) |
| Case study and screenshots | [Investigation, architecture and measured results](docs/portfolio/case-study.md) |
| Interactive demo | [Open the demo](https://opslens-3xy1.onrender.com/) · [Local setup](docs/runtime.md#fresh-checkout) |
| Component library | [Open Storybook](https://opslens-storybook.vercel.app/) · [Component guide](https://opslens-storybook.vercel.app/?path=/docs/guide-using-opslens-ui--docs) · [Local setup](packages/ui/README.md#update-and-verify) |
| BI comparison | [Superset baseline and reproduction](superset/README.md) · [Independent reconciliation](superset/reconciliation.json) |
| Evaluation and release evidence | [Copilot](evals/copilot/README.md) · [Retrieval](evals/retrieval/README.md) · [Release checks and benchmarks](docs/release-verification.md) |
| Interview and launch review | [Interview notes](docs/portfolio/interview-notes.md) · [Launch checklist](docs/portfolio/launch.md) |

The demo runs on Render Free and may take a moment to wake up. Copilot shows a labelled recorded answer. Live model and document evidence are disabled.

## Implementation

React and TypeScript power Overview and Activity. The charts use native SVG and CSS, the Activity table uses TanStack Table and Virtual, and both screens consume a shared themed UI package. Hono serves the Vite build and validated analytics on the same origin. PostgreSQL filters, aggregates and pages data behind a restricted server login. The client types are generated from OpenAPI.

Use the Node version in `.nvmrc` and the pinned pnpm version. `pnpm check` verifies the metric oracle, API contracts, builds, production browser flow and Storybook. [Metric definitions](docs/metric-contract.md) · [Build plan](docs/build-plan.md) · [Development evidence](docs/development-evidence.md)

OpsLens source is available under the [MIT License](LICENSE). Third-party projects keep their own terms; see the [asset and dependency notes](docs/portfolio/launch.md#publication-review).
