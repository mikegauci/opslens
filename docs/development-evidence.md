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

## PLAN-04 — 6 November 2026

The production aggregation was written after the literal oracle; API verification imports those existing expectations without generating them from the service. Checks compare every oracle slice, exact daily GGR, provider changes, placement-versus-settlement IDs and tied pagination. The same generated client also crosses production HTTP and the real bulk database. This is AI-assisted self-review, not peer or Superset validation.

Type checking caught that Hono's supported status codes exclude the initially proposed 499 cancellation response. The contract now uses 408 if a response can still reach the caller, while ordinary client cancellation rejects with AbortError. A real blocked PostgreSQL statement verifies cancellation and recovery, rather than treating a mocked abort as proof. A separate lock verifies the three-second timeout; cancellation during pool wait is also checked. Self-review added connection-acquisition error normalization and explicit repeated-filter rejection.

Measured plans showed full sequential scans despite bounded transfers; the deep stake page performed materially more work than the first date page. The benchmark keeps that outlier and its instrumented plan. Offset pagination is a deliberate bounded numbered-page choice for this immutable dataset, with a dataset-hash conflict on reseeding; it is not claimed to have keyset performance. Index/keyset comparison remains an evidence-driven explorer follow-up. The raw local measurements establish no hosted latency.

## PLAN-06 — 6 November 2026

AI-assisted implementation supplied the overview, local request-state hook, URL scope model and browser verification. The unchanged twelve-row oracle predates the UI; browser requests use the generated client and real API/SQL inside a rollback-only fixture transaction. A separate production journey exercises the selected 100k seed. SVG/CSS was chosen for at most 90 daily points/three providers, retaining named links and semantic data alternatives without a chart framework. This is self-review, not peer review or a Superset comparison.

Rendered verification confirmed the literal €36 stakes, €40 payouts, −€4 GGR, four distinct players and −€32/+€25/€0 provider changes. Browser testing caught implicit select labels including option text; explicit labels fixed the names. Navigation and successive filter changes then exposed duplicate form nodes: the initial hook returned a property named `key` and spread its state into Panel, colliding with the keyed filter form during React reconciliation. An initial form-restoration diagnosis was incomplete. Renaming it `requestKey`, passing explicit panel props, and keeping controlled drafts corrected the actual collision; Back/Forward and single-form regression assertions pass.

The stale-response test deliberately removes fetch cancellation so a delayed Harbor response is delivered after the Summit result. The effect ownership guard keeps Summit's literal €20 GGR and scope. Dataset mismatches and malformed success bodies also fail closed, retaining labelled old results and disabling chart links. Initial concurrent Chrome/unit execution exceeded the existing 100k hash test's five-second limit; the required sequential full gate passed without weakening the test. No team adoption, manual screen-reader audit or hosted performance is inferred from these checks.
