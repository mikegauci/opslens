---
name: add-dashboard-metric
description: Add or change a metric on the OpsLens Overview from its definition through server analytics, the generated API contract, and the rendered dashboard. Use for metric semantics or delivery changes.
---

Start with the requested metric, its placement and a known filter slice. Resolve the formula, unit, eligible rows, aggregation grain, date basis, comparison, and empty or undefined results in `docs/metric-contract.md`. For a ratio, work out the result from eligible period totals and check whether a row- or day-level average would give a different answer.

1. Extend `data/fixtures/metric-oracle.json` with independently worked expectations before implementing the calculation. Keep the original rows and expectations when they already exercise the relevant cases. Record the arithmetic in the fixture README.
2. Trace the existing query and scope through `packages/analytics/src/service.ts` and `schemas.ts`. Reuse eligible aggregates when possible. Check whether a shared schema also feeds daily series, Copilot evidence or other consumers before adding fields. Keep the existing scope and snapshot metadata. Regenerate both contract outputs with `pnpm contracts:generate`.
3. Render the validated result in `apps/web/src/overview.tsx` using the existing panel and MetricCard. Keep unavailable values distinct from numeric zero, describe the reason, and label comparison units explicitly. Check the card at narrow and wide widths and verify existing stale and empty panel states.
4. Extend the closest existing API oracle and Playwright checks. Check literal values under filters and missing or undefined data through the normal entry points. Update `docs/analytics-api.md` and affected consumer documentation. Run `pnpm check` using the database setup in `docs/runtime.md`. Record the prior behaviour, actual checks and observed changes to AI output in `docs/development-evidence.md`.
