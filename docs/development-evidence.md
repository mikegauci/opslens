# Development evidence

## PLAN-02 — 6 November 2026

AI-assisted implementation supplied the first five-package scaffold, typed API contract and production browser smoke. Human workflow constraints retained: one issue/PR, React without Angular, no Figma and no duplicate design plan. This is an AI-assisted, self-reviewed change; no peer review or team adoption is claimed.

The first local PostgreSQL initialization failed because the inherited locale was invalid. Retrying with explicit `C`/UTF-8 exposed a system shared-memory permission requirement; initialization then succeeded with the required execution permissions. The test uses an isolated temporary cluster, not an existing user database. Docker's daemon was unavailable, so local evidence must describe Homebrew PostgreSQL rather than pretend Docker was tested.

Hosting review rejected an assumed drop-in Sites deployment: its Worker transport differs from this Node/`pg` entrypoint. The selected runtime is tested locally and in CI; hosted ingress remains unverified. Future live AI work must not present this diagnostic SSE as model output.

Registry peer verification caught two initial incompatible suggestions: TypeScript 7 exceeded openapi-typescript's supported TypeScript 5 peer range, and esbuild 0.25 was below Vite's supported peer range. Both were corrected (TypeScript 5.9.3, esbuild 0.28.2); `pnpm peers check` then reported no issues. pnpm 12 also ignores legacy `onlyBuiltDependencies`; consulting its current docs led to the explicit `allowBuilds: { esbuild: true }` policy. These are observed corrections, not fabricated examples.

The SSE test caught Hono replacing an earlier `Cache-Control` header with its default `no-cache`. The fix applies `no-cache, no-transform` to the returned streaming response, and the test remains. React self-review also changed a retry-token effect into a keyed diagnostic component, so each retry owns and cleans up its fetch and EventSource. Domain, API and browser checks verify actual behavior rather than only scaffold structure.

## PLAN-03 — 6 November 2026

The metric oracle was authored as twelve explicit records and literal expected values before production aggregation. Self-review worked through the sums, distinct players and boundary rows directly; the arithmetic is committed alongside the fixture. Independently written PostgreSQL verification reconciles those literals as the restricted role. No human peer sign-off or production/Superset reconciliation is claimed.

The accepted bulk-data approach uses fixed uint32 state, UTC and canonical CSV hashing instead of clock/random/locale-dependent exports. Both sizes were seeded twice in a clean disposable PostgreSQL 17.11 database, then every stored row was read as the application login and reconciled to the approved hash. Simulated Supabase Data API roles exercise effective grants without claiming a hosted Supabase audit.

Self-review corrected the first denied-write probes to run inside rollback-only transactions, ensuring an unexpected successful probe cannot persist a destructive change. The checks explicitly disable the application's session read-only default before probing writes, so passing results establish real grant denials. Deliberately altered manifest bytes and an applied migration were rejected, then restored. Type checking also caught widened literal types in the generator; explicit transaction return types fixed the mismatch. These are observed checks/corrections, not external review evidence.
