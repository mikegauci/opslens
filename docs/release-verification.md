# PLAN-13 release verification

Verified the production Vite build served by Hono on Node 24.20.0 against PostgreSQL 17.11 with the restricted runtime login. The data was the deterministic synthetic 10k and 100k seeds. [PLAN-13 / #13](https://github.com/mikegauci/opslens/issues/13)

## Investigation and accessibility

- The production browser checks use the real API and database for the Overview filters, provider drill-down, Activity pagination, sort, pending placements, URL reload and history, transaction details, and the credential-free Copilot example and its snapshot-pinned Activity link. Literal fixture and fault-injection checks additionally cover a day drill-down, stale responses, malformed data, snapshot conflicts, empty results and retries. Live answer UX is exercised with scripted events.
- Axe 4.14.0 runs the WCAG A/AA tags through 2.2 on Overview, a scoped Activity table, transaction details, and the expanded no-key Copilot example, at 1280 and 390 CSS pixels. The first run flagged 13 visible-text/accessibility-name mismatches and the SVG image role's focusable descendants at each width. The table links now display their scoped names and can wrap on narrow screens, provider bars include their visible labels and amounts in their accessible names, and the daily chart exposes a named group containing its interactive marks. The follow-up scans returned zero violations in those eight states.
- Browser keyboard checks cover Tab from the chart refresh control to the first daily mark, Enter on a scoped action, Escape and focus return for transaction details and Copilot, and Activity focus after paging and virtual loading. The Chromium accessibility tree exposes the daily marks as links and the paginated Activity table with header and row semantics.
- The native desktop service failed to start on discovery and direct Chrome access, including after a session reset. The keyboard inputs were browser-automated. A native manual walkthrough and VoiceOver speech remain open. On a working desktop, run the production server, use [VoiceOver](https://support.apple.com/en-gb/guide/voiceover/vo2682/mac) to navigate the filters and chart marks, inspect the table headers and row values, and verify announcements and focus after opening and closing both drawers and when results or errors update.
- No genuine peer review was available in issue #13 or PR #27. The optional PLAN-12 skill trial was deferred by the owner.

## Superset reconciliation

Started a fresh Superset 6.1.0 metadata database and ran the six charts against the same restricted PostgreSQL connection and 100k snapshot. Default, Harbor and Nova matched all four cards, every UTC day and GGR value, and each signed provider change. The React check visits the same three scopes through the production API and compares the rendered cards and both data tables against the independent reconciliation. Hold is covered by the literal oracle and has no matching Superset card. The first isolated bootstrap wrote its generated password to the retained baseline’s default password file. The retained local login was repaired and verified against that file, and the isolated run used separate metadata and password-file paths. [Independent results](../superset/reconciliation.json) · [Superset captures and reproduction](../superset/README.md)

## Setup and release behavior

- Exported merged main into a fresh directory and installed frozen dependencies with pnpm 12.11.2. The first install selected an empty temp cache and failed on restricted registry DNS. Using the existing package store succeeded. Docker Compose could not connect to the Docker daemon. The PostgreSQL fallback used a fresh local database on port 54339. Both migrations ran twice, the restricted login was configured, and both 10k and 100k seeds loaded twice with identical hashes. Data verification covered constraints, RLS, write denial and SQL/API reconciliation. CI uses a fresh Linux checkout with a PostgreSQL service and the pinned Playwright browser.
- The built server exited 1 with a clear error when `DATABASE_URL` was missing. With an unreachable database, health and summary returned sanitised JSON 503s. The healthy instance returned 200 for the diagnostic and valid analytics, 400 for an invalid date and JSON 404 for an unknown API route. With model credentials absent, Copilot reported both capabilities false and returned 503 on a valid question. The dashboard and recorded investigation remained usable.
- With a dummy model configuration and a test database, a wrong origin received 503. The configured origin received 429 once the global counter was exhausted. A separate real PostgreSQL concurrency check admitted five per visitor and 50 overall across independent pools, denied a new pool after exhaustion, verified retention and grants, and passed 19 scripted analytical and mixed cases. Both checks avoided provider requests. The production server reported documents unavailable in both credential modes.
- GitHub reported zero deployments. Verification covered the local production runtime and CI. Managed ingress, TLS, regional latency, hosted secrets and live provider behaviour remain open. Live analytics evaluation and human relevance review remain pending. Live document evidence stays disabled.

## 10k and 100k performance

Intel Core i7-7660U (four logical CPUs, 16 GiB), macOS 13.7.8, Chrome 156.0.8078.80, Node 24.20.0 and PostgreSQL 17.11. Both services ran on the same host over loopback, with no network or CPU throttling or ingress compression. Each final-build browser series used five serial fresh 1280×900 contexts against a running server and warm database/OS caches. Each API scenario used 21 serial requests with full JSON consumption, with the first sample reported separately in the [raw measurements](benchmarks/plan-13-release.json). The API and Activity query benchmarks ran on merged PLAN-12 because the API and Activity implementation did not change in PLAN-13. SQL execution times are separate instrumented runs. The first browser sample is a fresh context, and server process and database cold starts were outside the test.

| Median browser observation | 10k | 100k |
| --- | ---: | ---: |
| Overview to usable drill-down | 468 ms | 425 ms |
| Apply Harbor to usable drill-down | 135 ms | 190 ms |
| Nova drill-down to first visible row | 280 ms | 275 ms |
| Open transaction details | 44 ms | 42 ms |
| Initial Overview transfer including headers | 409.1 kB | 409.1 kB |
| Activity API page transfer including headers | 27.5 kB | 27.5 kB |
| Post-GC JS heap, Overview / Activity | 3.44 / 4.13 MiB | 3.43 / 4.09 MiB |

| Scenario | Warm median HTTP, 10k / 100k | SQL execution, 10k / 100k |
| --- | ---: | ---: |
| Summary | 9.0 / 33.3 ms | 2.7 / 23.3 ms |
| Daily trend | 6.8 / 26.1 ms | 10.4 / 26.1 ms |
| Provider contributions | 5.9 / 17.4 ms | 2.7 / 13.3 ms |
| First Activity page | 6.6 / 16.3 ms | 1.4 / 13.7 ms |
| Harbor/Nova page, 100 rows | 6.7 / 17.3 ms | 1.2 / 12.8 ms |
| Stake sort, offset 5,000 | 9.8 / 34.7 ms | 6.5 / 33.4 ms |
| Pending placement page | 5.8 / 15.4 ms | 1.1 / 10.1 ms |

The 100k scope took more database work, while fixed-size responses held transfer and heap nearly flat. Initial Overview samples overlapped (356–719 ms at 10k and 346–767 ms at 100k). In the separate 100k virtual Activity sample, the browser rendered 14 rows at both 100 and 1,000 loaded rows. The ten pages transferred 270,334 body bytes and the post-GC heap rose from 3.33 to 4.45 MiB, reaching 4.92 MiB after scrolling to the last row. An offset-50,000 stake sort took 83 ms in the instrumented query and wrote 1,116 temporary blocks. This is a local scaling cost to track for deep arbitrary sorts.

The M1 diagnostic was 227.9 kB of JS and 230.8 kB total transfer on this host. The finished Overview ships 394.6 kB of JS and transfers about 409 kB without compression. The increase covers the dashboard, client-side response validation, Activity and Copilot in the shared entry. Rebaseline review thresholds for this build at 410 kB uncompressed JS, 450 kB initial Overview transfer, and 5 MiB post-GC JS heap for a single Activity page. Explain increases above those thresholds or 20% above a comparable 100k interaction median in the PR. These are local review thresholds for repeat runs.

To reproduce, build once, start `pnpm start` on port 3000 with the restricted login, seed a disposable database for each size, and run `node --import tsx scripts/benchmark-release.ts`. Use `PLAYWRIGHT_CHANNEL=chrome` on this macOS 13 host. For API/SQL measurements run `pnpm benchmark:api` for each seed. Run `pnpm benchmark:activity` with the 100k seed for the virtual table and offset-50,000 query. The API and Activity scripts overwrite their respective historical output paths, so run them in a disposable source copy to keep earlier measurements.
