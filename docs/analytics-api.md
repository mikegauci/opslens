# Analytics API — PLAN-04

The shared server service is `packages/analytics/src/service.ts`; HTTP adapters and future read-only tools use it. It validates inputs independently of HTTP, uses parameterized values and closed SQL identifier vocabularies, and returns integer EUR minor units. PostgreSQL aggregates, filters, sorts and pages the dataset; the client never downloads it to calculate cards. Unsafe bigint-to-JavaScript conversions fail closed rather than round money.

## Scope and results

All four GET routes require canonical millisecond UTC `from` and `to` timestamps, with inclusive start/exclusive end, positive duration and a maximum 90-day range. Optional `brand` is `harbor|summit`; `provider` is `nova|orbit|pulse`. Unknown and repeated parameters are rejected. The date range must fit the active dataset; activity can extend through its `asOf` to inspect boundary records. Metrics must fit the reporting `from`/`to` window and use complete UTC days. There is no implicit clock-based default.

| Route | Behaviour |
| --- | --- |
| `/api/summary` | Current settled stakes, payouts, GGR, distinct players and hold percentage; equal immediately preceding period, absolute GGR change and comparative percentage |
| `/api/trend` | The same settled metrics by UTC day, including explicit zero days. Daily distinct players must not be summed into a period player total |
| `/api/contributions` | Current/previous GGR and absolute minor-unit change by provider present in either period, ordered by provider ID. Changes reconcile to overall GGR change |
| `/api/activity` | Transaction snapshot rows with explicit date basis, status, allow-listed sorting and bounded pages |

Metric eligibility is always settled status and settlement timestamp. A comparison extending before the dataset window is unavailable: previous totals/change are `null` with `outside_dataset_window`. A GGR percentage is unavailable for zero or negative previous GGR (`nonpositive_baseline`); absolute change remains available. Contribution values are signed EUR differences and describe observed changes.

The summary includes `current.holdPercent` and, when the previous period exists, `previous.holdPercent`. Each is a number in percentage units (for example, `20` means 20%) or `null` if that period's settled stakes are zero. Each uses its own aggregate GGR and stakes. The Overview shows the difference in percentage points only when both hold values are available. See the [metric contract](metric-contract.md).

Every success includes `metadata`: effective dates, brand/provider filters, basis/status, `synthetic: true`, EUR, UTC, dataset schema/generator versions, seed, hash, row count, window and as-of timestamp. An omitted brand/provider means all; activity `status: null` means all final snapshot statuses. Each request uses a read-only repeatable-read transaction so figures and metadata share one snapshot, including during atomic reseeding. Dataset version identifies this final-status snapshot, not an event ledger. [PostgreSQL snapshot semantics](https://www.postgresql.org/docs/17/transaction-iso.html).

## Activity pages

`basis=settlement` is the default, with effective settled status. Only `status=settled` is compatible with that basis. `basis=placement` allows an omitted status (all) or `settled|pending|void`; pending/void rows have null payout and settlement. `sort=date|stake` and `direction=asc|desc` default to date descending. Date sorts the selected basis column; stake sorts minor units. Both append ID in the same direction as the deterministic tie-breaker.

`limit` is 1–100 (default 50); `offset` is 0–100000 (default 0). The database fetches at most limit+1 rows; `page.nextOffset` is null at exhaustion. Subsequent pages must send the returned `page.datasetHash`. A changed hash returns 409; restart from offset zero. Keep the whole filter/sort scope with each page. The seed is immutable between atomic replacements, so offset ordering is stable within its hash. Bounded offset pagination deliberately supports an accessible numbered-page explorer; it scans/sorts skipped rows. It is not constant-time keyset pagination. The recorded deep-page scenario measures that cost; reconsider keyset pagination if future volume or measurements warrant it.

## Generated client, errors and cancellation

Hono/Zod schemas are the source; `pnpm contracts:generate` writes OpenAPI and TypeScript declarations. `@opslens/contracts` exports an `openapi-fetch` client (`api`) and `createApiClient` for an explicit base URL/transport. It infers the four query/response contracts from generated declarations. Pass timestamps and page parameters as strings. For example:

```ts
const result = await api.GET("/api/activity", {
  params: { query: {
    from: "2026-09-22T00:00:00.000Z", to: "2026-09-29T00:00:00.000Z",
    basis: "settlement", provider: "nova", limit: "50",
  } },
  signal: controller.signal,
});
```

`result.data` is success; non-2xx responses populate `result.error` and expose the HTTP response status. Analytics errors have `{error: {code, message}}`. 400 `INVALID_QUERY` covers syntax/unknown IDs/incompatible/out-of-window scopes; 409 `DATASET_CHANGED` restarts pagination; 503 `UNAVAILABLE` covers missing metadata, connection failures, unsafe numeric results or invalid internal output; 504 `TIMEOUT` is the three-second PostgreSQL statement timeout. Database internals and credentials are not returned. Responses use `Cache-Control: no-store`.

`AbortController` cancellation rejects client fetch with `AbortError`; it is not an error-shaped successful response. The server checks the request signal, destroys only the leased connection on abort and releases/discards connections on every path. Cancellation while awaiting a pool slot is observed once the bounded acquisition completes (connection/pool wait limit three seconds); it does not execute analytics afterward. If the caller still receives an HTTP response, cancellation uses 408 `CANCELLED`; disconnected callers usually receive no response. The timeout is per statement, not a total HTTP deadline. Ordinary network failures reject fetch and have no HTTP error body.

Consumers must cancel superseded requests **and** key/cache results by the entire query scope and dataset hash, or compare a request generation before applying results. Cancellation cannot recall a response already delivered. PLAN-06/07 implement and test that UI ownership; this API milestone does not claim rendered stale-response protection. Unit tests cover the wire error/validation contract; the real database gate exercises blocked-query abort, timeout, pool-wait cancellation and recovery. Generated-client checks cross both the oracle adapter and production HTTP transport.

## Measurements

Run a production build, select each seed with the documented separate database connections, run `ANALYZE opslens_private.transactions` as the development owner, then `pnpm benchmark:api`. It starts/stops the production Node entrypoint on loopback port 3104 and writes raw timing samples, parameterized SQL and `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` plans as the restricted application role. The seed is selected separately; the benchmark itself is read-only. [PostgreSQL EXPLAIN interpretation](https://www.postgresql.org/docs/17/using-explain.html).

Captured 6 November 2026 on Intel i7-7660U (4 logical CPUs), 16 GiB RAM, macOS 13.7.8 / Darwin 22.6.0, Node 24.20.0, PostgreSQL 17.11. Concurrency one, no network/CPU throttling, no ingress compression. The health readiness check warmed the pool; seeding/ANALYZE had already warmed database/OS caches. “First” is the first analytics request for that scenario, **not a cold start**. Warm median/max use the following 20 complete HTTP responses, including JSON transfer/validation. Raw artifacts retain every sample, exact filter/SQL and manifest/hash: [10k](benchmarks/analytics-10000.json), [100k](benchmarks/analytics-100000.json).

| Scenario | 10k warm median ms | 100k first ms | 100k warm median / max ms | 100k bytes |
| --- | ---: | ---: | ---: | ---: |
| Summary (two periods) | 8.1 | 106.2 | 43.3 / 168.0 | 814 |
| Seven-day trend | 6.9 | 40.2 | 30.5 / 36.3 | 1398 |
| Provider contributions | 6.0 | 20.4 | 18.4 / 21.4 | 819 |
| Activity first 50 | 7.1 | 21.0 | 16.7 / 27.5 | 13834 |
| Harbor/Nova activity first 100 | 9.9 | 23.2 | 16.7 / 20.8 | 27182 |
| All-window stake sort at offset 5000 | 10.8 | 43.6 | 73.8 / 221.3 | 13786 |
| Placement-basis pending first 50 | 5.9 | 65.4 | 29.1 / 60.0 | 12771 |

Plans use the restricted role and real RLS. All transaction scans were sequential, with shared-buffer hits and zero shared reads in these captures; only the existing primary key exists. At 100k the seven-day current summary scanned 6,865 eligible rows and rejected 93,135; its isolated SQL took 28.9 ms. Contributions scanned 13,605 rows over two periods and took 15.5 ms. Default activity used top-N heapsort, returned 51 rows for the 50-row page and took 12.2 ms. Transfer stays bounded separately from scan cost.

The deep stake page's plan used parallel sequential scans, top-N sorts and Gather Merge; it consumed 5,051 merged rows to return 51. Its instrumented SQL capture took 272.9 ms, slower than the separate HTTP sample maximum. EXPLAIN instrumentation and scheduling change timings; the captures are not an additive HTTP timing breakdown. Nothing spilled to disk. This supports a concrete next performance investigation: compare keyset traversal and composite indexes for the explorer's actual sorts/filters in PLAN-07. No speculative indexes or forced planner settings are introduced here. These local warm-cache observations are not hosted, concurrent-user, cold-start, browser-interaction or service-level guarantees.
