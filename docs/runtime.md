# PLAN-02 runtime spike

## Decision

Select Node 24 LTS with Hono's Node adapter for the foundation. One process serves the Vite production assets, `/foundation`, and `/api/*` on one origin. Relative API URLs keep previews self-contained. PostgreSQL is accessed only by the API through `pg`; the browser has no database credentials. The checked-in production entrypoint is `pnpm start` after `pnpm build`, with the repository root as its working directory.

This spike proves the selected **Node runtime locally and in CI**. It does not claim a hosted preview, provision a cloud account, or verify a provider's ingress buffering, TLS, regional latency, pooling or cold starts. Select/provision the managed Node/container host before a public demo, then repeat these same checks through its real URL. Do not call local evidence cloud deployment evidence.

| Option                | Adapter and tradeoff                                                                                                                                                                                                                                                   | Decision                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Portable Node service | Hono `@hono/node-server`; Vite files served by the same process. Native `pg`, explicit pool/timeouts and ordinary SSE. Host must support Node 24, a long-lived process and unbuffered streaming. Asset CDN, process scaling and managed ingress remain host decisions. | Selected runtime; reproducible without a vendor account.                               |
| Sites                 | The installed Sites skill specifies a Cloudflare Worker runtime, HTTP external connections and no raw TCP. Its Vinext/Worker starter and build integration would require replacing or adapting this Vite/Node entrypoint plus an HTTP database transport.              | Evaluated, not provisioned. Avoid claiming the current Node adapter deploys unchanged. |
| Vercel Services       | Vite and Hono services could share ordered `/api` ingress and a release. Current public Beta requires a Services project and service-specific config; Node connection pooling and streaming still need a hosted test.                                                  | Viable alternative, not verified or configured here.                                   |

Sources consulted 6 November 2026: [Hono Node adapter/static paths](https://hono.dev/docs/getting-started/nodejs), [Hono streaming](https://hono.dev/docs/helpers/streaming), [Vercel Services public Beta announcement](https://vercel.com/blog/vercel-services-run-full-stack-on-vercel), [Services configuration guide](https://vercel.com/kb/guide/vercel-services), [Node 24 LTS](https://nodejs.org/en/blog/migrations/v22-to-v24). Sites runtime constraints come from the installed `sites/SKILL.md`; no unsupported adapter was invented. Older indexed Services documentation still describes the experimental config, so no untested `vercel.json` is committed.

## Fresh checkout

1. Install/use Node from `.nvmrc` (`nvm install && nvm use` if using nvm), then `npm install --global pnpm@12.11.2`.
2. `pnpm install --frozen-lockfile`.
3. `cp .env.example .env` and `docker compose up -d --wait db` with a running Docker engine. The database binds only to loopback, uses a named volume and uses development-only credentials. Stop it with `docker compose down`; add `--volumes` only when intentionally discarding its local data.
4. `pnpm build && pnpm start`, then visit `http://127.0.0.1:3000/foundation`. It shows the real `SELECT 1` result and completion of a finite two-event diagnostic stream. It is not a dataset or live AI response.
5. For editing with hot reload, leave the API running and use `pnpm --filter @opslens/web dev` in another terminal. Vite proxies `/api` to port 3000. `pnpm dev` is a convenience build-and-start of the production spike, without hot reload.

An existing PostgreSQL 17 instance also works: create a disposable `opslens` database and set `DATABASE_URL` accordingly. Local verification used Homebrew PostgreSQL 17.11 because Docker's daemon was unavailable. No Supabase resource is needed for this connectivity spike. PLAN-03 establishes schemas, repeatable seed/migrations and restricted application grants; the empty development database's owner role must not become the deployed analytics role.

Required server variable: `DATABASE_URL`. Optional: `PORT` (3000), `HOST` (`127.0.0.1`; use `0.0.0.0` behind managed ingress). Node loads ignored `.env`; real hosting injects secrets. Never place server variables in Vite-prefixed variables. Pool: at most five connections, three-second connect/statement timeouts. Use a provider's TLS-verified/pooler connection string in hosting; do not disable certificate verification. Budget connection counts against instances before scaling.

## Verification and contracts

Run `pnpm exec playwright install chromium` once on a supported OS; Linux CI installs browser system dependencies too. On this macOS 13 machine the current bundled Chromium is unsupported: use installed Chrome with `PLAYWRIGHT_CHANNEL=chrome pnpm check` (and the same variable for `pnpm benchmark`). This is an explicit local fallback, not evidence for the pinned CI browser. Keep the database running, stop any app on port 3000, then run `pnpm check`.

- Biome checks code/style and TypeScript checks all packages.
- Vitest covers integer money, API availability/error responses and SSE ordering. API unit tests inject the database boundary; the production browser smoke performs the actual PostgreSQL query.
- Playwright starts the production Node server, verifies the route → generated client → API → PostgreSQL → UI flow, error/retry recovery, and that the first HTTP stream chunk precedes completion. No AI key or remote provider is needed.
- API schemas are declared once with Hono/Zod. `pnpm contracts:generate` exports OpenAPI and generates `schema.d.ts` using openapi-typescript's Node API. Commit both outputs. `pnpm contracts:check` regenerates and fails on tracked changes. Do not hand-edit generated files. [Generator API](https://openapi-ts.dev/node), [typed fetch client](https://openapi-ts.dev/openapi-fetch/).
- Unknown API routes return JSON 404, never SPA HTML. Database failure returns a non-sensitive 503; startup without `DATABASE_URL` fails clearly.

CI runs the same checks with a real PostgreSQL service and Chromium. There are no live AI calls or dummy badges. Full dashboard, accessibility, seed-volume and AI checks are added with those capabilities. CI artifacts retain failing browser traces. Dependency versions are exact, peers were checked against registry metadata, and the lockfile is required; upgrades repeat this verification.

## Initial performance conditions

[Raw baseline](foundation-baseline.json), captured 6 November 2026, records the hardware, browser, OS, runtime and every round trip. This is one local observation on a four-thread Intel i7-7660U with 16 GiB RAM, macOS 13.7.8, Node 24.20.0, Chrome 156, loopback PostgreSQL 17.11 and no network/CPU throttling. The server was already running; the fresh browser's first journey warmed the pool and included the deliberate 200 ms stream delay. There are **zero dataset rows**, so this establishes no 10k/100k query or production performance claim.

Observed first journey through database and stream completion: 1,907 ms; DOMContentLoaded: 394 ms; document plus resource transfer: 230,848 bytes without an ingress compressor. Ten subsequent Node health HTTP round trips: median 13.2 ms, range 6.9–98.1 ms (first includes a fresh HTTP connection). These are end-to-end connectivity timings, not isolated SQL timings or a statistical service target. Vite emitted 227.88 kB JavaScript (71.61 kB estimated gzip); the server currently sends uncompressed assets.

Initial review guardrails: keep this diagnostic entry's JS under 250 kB uncompressed and explain any comparable baseline regression over 20% in the PR; these are review thresholds, not CI timing assertions. Rebaseline deliberately when real screens and data arrive. PLAN-03/04 add representative SQL/query plans; PLAN-06/07/13 measure the full 10k/100k interactions, memory and transfer with server region and cold/warm conditions. Do not use local timings as cloud budgets.

To reproduce, run the production server and database, then `pnpm benchmark` in another terminal (use the Chrome variable above on this Mac). It overwrites the baseline JSON and writes review screenshots to `/tmp`. Desktop (1280 px) and mobile (390 px) snapshots were visually reviewed with no clipping: [desktop](images/foundation-desktop.png), [mobile](images/foundation-mobile.png). This does not claim a full accessibility audit or screen-reader review.
