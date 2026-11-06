# Development evidence

## PLAN-02 — 6 November 2026

AI-assisted implementation supplied the first five-package scaffold, typed API contract and production browser smoke. Human workflow constraints retained: one issue/PR, React without Angular, no Figma and no duplicate design plan. This is an AI-assisted, self-reviewed change; no peer review or team adoption is claimed.

The first local PostgreSQL initialization failed because the inherited locale was invalid. Retrying with explicit `C`/UTF-8 exposed a system shared-memory permission requirement; initialization then succeeded with the required execution permissions. The test uses an isolated temporary cluster, not an existing user database. Docker's daemon was unavailable, so local evidence must describe Homebrew PostgreSQL rather than pretend Docker was tested.

Hosting review rejected an assumed drop-in Sites deployment: its Worker transport differs from this Node/`pg` entrypoint. The selected runtime is tested locally and in CI; hosted ingress remains unverified. Future live AI work must not present this diagnostic SSE as model output.

Registry peer verification caught two initial incompatible suggestions: TypeScript 7 exceeded openapi-typescript's supported TypeScript 5 peer range, and esbuild 0.25 was below Vite's supported peer range. Both were corrected (TypeScript 5.9.3, esbuild 0.28.2); `pnpm peers check` then reported no issues. pnpm 12 also ignores legacy `onlyBuiltDependencies`; consulting its current docs led to the explicit `allowBuilds: { esbuild: true }` policy. These are observed corrections, not fabricated examples.

The SSE test caught Hono replacing an earlier `Cache-Control` header with its default `no-cache`. The fix applies `no-cache, no-transform` to the returned streaming response, and the test remains. React self-review also changed a retry-token effect into a keyed diagnostic component, so each retry owns and cleans up its fetch and EventSource. Domain, API and browser checks verify actual behavior rather than only scaffold structure.
