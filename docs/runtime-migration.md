# PLAN-15 runtime status migration

[PLAN-15 / issue #15](https://github.com/mikegauci/opslens/issues/15) is a small, staged migration exercise. OpsLens already used React, so the exercise introduces a static HTML fixture with a vanilla TypeScript controller on an isolated route. A React implementation takes over the same route when enabled. Both render one database check and a retry action. The static HTML contains the original document structure and works with its own controller.

## Run the cutover and rollback

Build once with `pnpm build`. Follow the [runtime setup](runtime.md#fresh-checkout) for the local database and server environment.

| Mode | Start command |
| --- | --- |
| Static HTML (default) | `OPSLENS_RUNTIME_REACT=0 pnpm start` |
| React | `OPSLENS_RUNTIME_REACT=1 pnpm start` |
| Rollback to static HTML | `OPSLENS_RUNTIME_REACT=0 pnpm start` |

Stop the previous process before starting the next mode. In all three modes, open or reload [the same runtime bookmark](http://127.0.0.1:3000/migration/runtime?from=bookmark#runtime-checks). The query stays in the URL and the fragment lands focus on **Database check**. Both builds show the same status and preserve keyboard focus when retrying. The same-origin `GET /api/health` uses the existing PostgreSQL probe and OpenAPI contract. The browser checks the database and result fields before displaying success.

The flag is evaluated at server startup. Only the literal value `1` selects React. The two HTML entry points and their hashed assets ship together, so rollback uses the same build and requires a restart. The route serves its HTML with `Cache-Control: no-store` so a reload requests the selected document.

## Verify parity

Run `pnpm build && pnpm test:e2e migration.spec.ts` with the database available and ports 3000 and 3015 free. The same test runs on both production configurations. It checks the delivered HTML variant, the unchanged URL and focus target after navigation and reload, the actual health response and UI success, a simulated 503 and keyboard recovery, and browser Back from Overview. The full `pnpm check` also checks generated-contract drift and runs the main application’s production tests.

## What a production migration would require

This exercise covers a one-route cutover and a rollback while both versions can consume one read-only API. A production migration would start by inventorying routes, bookmarks, shared state, permissions and integrations. It would need contract tests with representative legacy data, including compatibility for writes, concurrent sessions and schema changes during a rollback window.

Rollout would also need cohort controls, comparable performance and error metrics, explicit rollback thresholds and ownership, and validation of real ingress, cache behavior and accessibility. After a stable observation window, remove the flag, legacy assets and temporary compatibility paths.
