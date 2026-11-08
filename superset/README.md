# Local Superset baseline (PLAN-05 / #5)

This is a local comparison against fictional EUR transactions, not a hosted service or a public SQL endpoint. Money is displayed in **EUR minor units** to preserve exact integers. Divide by 100 for the React display in EUR. Periods are UTC, inclusive start/exclusive end; default current is 22–29 September 2026, compared with 15–22 September.

## Reproduce

Use Python **3.11.14**, Apache Superset **6.1.0** and the PostgreSQL driver **2.9.11**. Docker is not required: [official PyPI installation](https://superset.apache.org/admin-docs/6.1.0/installation/pypi/). On this Intel macOS 13 host, `uv` installs a standalone Python in `/tmp`; other supported hosts can use an existing Python of the same version.

From the repository root:

```sh
UV_CACHE_DIR=/tmp/opslens-uv-cache UV_PYTHON_INSTALL_DIR=/tmp/opslens-python uv venv --python 3.11.14 /tmp/opslens-superset-venv
UV_HTTP_TIMEOUT=600 UV_CONCURRENT_DOWNLOADS=3 UV_CACHE_DIR=/tmp/opslens-uv-cache uv pip install --python /tmp/opslens-superset-venv/bin/python -r superset/requirements.lock
superset/local.sh superset db upgrade
superset/local.sh superset init
# Supply the same restricted runtime connection described in docs/runtime.md.
export SUPERSET_DATABASE_URL="$DATABASE_URL"
superset/local.sh python superset/bootstrap.py
superset/local.sh superset run -h 127.0.0.1 -p 8088 --with-threads
```

Metadata, random secret key and random local admin password live under `/tmp/opslens-superset`, outside Git. Log in as `baseline` using the local `admin-password` file. Do not publish this development service. No owner connection is passed to Superset. No `.env` is needed. Local configuration enables trusted-admin Jinja templates; only use this with the closed synthetic vocabulary and local administrator access.

The dashboard script creates four cards, a daily GGR line and a signed provider change bar. Dataset template parameters control dates, brand and provider; edit all three virtual datasets to the same scope before comparing. This baseline does not claim React's URL filters or linked transaction drill-down. React adds named filter controls, preserved URLs, data alternatives, independent retry and exact activity links. `/activity` remains the documented scope preview until PLAN-07.

Independent parameterised PostgreSQL queries are in `sql/`. Superset's virtual dataset SQL is the same text with trusted local template substitutions. Zero days/providers are retained, distinct players are counted across providers, pending/void rows are excluded, and comparison contribution is current minus equal previous period.

## Reconciliation

With separate owner/runtime environment variables from `docs/runtime.md`, run:

```sh
node --import tsx scripts/db/verify-superset.ts --record
pnpm exec biome format --write superset/reconciliation.json
```

The script reads the retained bulk dataset with the restricted role and compares summary, every daily GGR and every signed provider change through the HTTP API adapter. It then installs the **unchanged** twelve-row fixture inside an owner transaction, switches to the restricted role, compares all five literal scopes and literal provider changes, runs existing API literal checks and rolls back. It never seeds or rewrites the bulk dataset permanently. `reconciliation.json` records exact minor-unit results and the bulk dataset hash; it contains no connection information.

Literal current: stakes 3600, payouts 4000, GGR -400, players 4. Previous: 1500, 1200, 300, 2. Harbor: 1600, 4000, -2400, 4. Pulse: 0, 0, 0, 1. Empty: 0, 0, 0, 0. Provider changes: Nova -3200, Orbit +2500, Pulse 0; sum -700.

Exports must be sanitised before committing: replace connection URIs with a credential-free placeholder and remove passwords, encrypted passwords, SSH/tunnel settings and secret keys. Reconnect the database locally after importing. Never commit the metadata SQLite database or local state.

Bulk default period matches API exactly: stakes **34399900**, payouts **130924400**, GGR **-96524500** minor units, **1935** active settled players. The committed JSON also records Harbor and Nova filter slices and every daily/provider value.

## Observed Superset verification

Executed locally on 6 November 2026: Python 3.11.14, Superset 6.1.0, PostgreSQL 17.11 (100k retained seed), Intel macOS 13.7.8, Chrome 156, loopback. Metadata migrations and role initialization passed; the actual dashboard has six successful chart-data responses. Screenshots were visually reviewed: [default](dashboard.png), [Harbor](harbor.png). `dashboard-results.json` and `harbor-results.json` contain only actual Superset response data rows, compared exactly with SQL/API evidence. These are correctness checks, not performance measurements or an accessibility audit.

The unconstrained PyPI installation omitted CLI `rich` and engine-discovery `cachetools`, and newer Flask-Caching/CacheLib APIs failed at startup. The final `requirements.lock` explicitly includes both missing dependencies and compatible Flask-Caching 2.3.1 / CacheLib 0.13.0. Reproduction uses the complete resolved lock rather than an unconstrained install. SimpleCache is local/in-process only. Large package transfers on this host took approximately 31 minutes; this is setup time, not chart latency.

`baseline.zip` is the actual 12-file dashboard/dataset/chart export, produced by `superset/local.sh python superset/export.py`. The database entry is replaced with a minimal configuration and `postgresql://localhost/RECONNECT_LOCALLY`; it contains no username, password, encrypted extra or tunnel settings. To import, extract a **private temporary copy**, replace that placeholder with your restricted runtime URI, re-zip the `opslens_baseline` directory and use Superset's dashboard import. Keep that private copy outside Git and discard it afterward. Alternatively run `bootstrap.py` to reproduce directly, supplying the URI through the environment. This export does not provision the transaction database. The export was inspected for secrets; import round-trip is not yet claimed.

To reproduce Harbor, rerun bootstrap with `BASELINE_BRAND=harbor`; to restore default, rerun without that variable. `BASELINE_PROVIDER=nova` also applies a closed-vocabulary provider scope. All three virtual datasets are updated together. No native filter bar is claimed.

Capture again while Superset runs with `node superset/capture.mjs` (default) or `node superset/capture.mjs harbor` after applying Harbor. This uses the repository's Playwright installation and installed Chrome, reads only the external local admin password file, waits for six successful chart responses, and saves response rows plus a screenshot. `python3 superset/verify_capture.py` checks the default, Harbor and Nova captures against the independently reconciled evidence. PLAN-13 reproduced the default and Harbor captures on a fresh local metadata database and added [the Nova response rows](nova-results.json). It does not claim to query a live server itself.
