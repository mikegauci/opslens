import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { Activity } from "./activity";
import {
  activityUrl,
  day,
  defaultQuery,
  money,
  overviewUrl,
  parseOverview,
  type Query,
  range,
  scopeLabel,
  shiftDay,
} from "./scope";
import { usePanel } from "./use-panel";

const signed = (value: number, players = false) =>
  `${value > 0 ? "+" : ""}${players ? value.toLocaleString("en-IE") : money(value)}`;
const names = { nova: "Nova", orbit: "Orbit", pulse: "Pulse" };

function Panel({
  title,
  children,
  loading,
  stale,
  error,
  retry,
  snapshot,
}: {
  title: string;
  children: ReactNode;
  loading: boolean;
  stale: boolean;
  error?: string;
  retry: () => void;
  snapshot?: string;
}) {
  return (
    <section className="panel" aria-label={title} aria-busy={loading}>
      <div className="panel-heading">
        <h2>{title}</h2>
        <button className="quiet" type="button" onClick={retry}>
          {error ? "Retry" : "Refresh"} {title.toLowerCase()}
        </button>
      </div>
      <div role="status">
        {loading ? (
          <p className="state">
            {stale
              ? "Refreshing… Previous results are stale."
              : "Loading analytics…"}
          </p>
        ) : null}
        {stale && !loading ? (
          <p className="state">Stale results · Drill-down paused</p>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
      {snapshot ? <p className="caption snapshot">{snapshot}</p> : null}
      {children}
      {loading && !snapshot ? (
        <div className="skeleton" aria-hidden="true" />
      ) : null}
    </section>
  );
}
function ScopeLink({
  href,
  enabled,
  children,
  label,
}: {
  href: string;
  enabled: boolean;
  children: ReactNode;
  label?: string;
}) {
  return enabled ? (
    <a href={href} aria-label={label}>
      {children}
    </a>
  ) : (
    <span aria-disabled="true" title={label}>
      {children}
    </span>
  );
}
function Filters({
  query,
  apply,
}: {
  query: Query;
  apply: (q: Query) => void;
}) {
  const [error, setError] = useState("");
  const [draft, setDraft] = useState({
    from: day(query.from),
    through: day(shiftDay(query.to, -1)),
    brand: query.brand ?? "",
    provider: query.provider ?? "",
  });
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const start = String(form.get("from"));
    const end = String(form.get("through"));
    if (!start || !end || !Number.isFinite(Date.parse(end))) {
      setError("Choose a valid start and end date.");
      return;
    }
    const params = new URLSearchParams({
      from: `${start}T00:00:00.000Z`,
      to: shiftDay(`${end}T00:00:00.000Z`, 1),
    });
    for (const key of ["brand", "provider"])
      if (form.get(key)) params.set(key, String(form.get(key)));
    const next = parseOverview(params.toString());
    if (!next) {
      setError("Choose an ordered date range of at most 90 complete UTC days.");
      return;
    }
    setError("");
    apply(next);
  }
  return (
    <form className="filters" onSubmit={submit} aria-label="Overview filters">
      <label>
        From (UTC)
        <input
          type="date"
          name="from"
          required
          value={draft.from}
          onChange={(event) =>
            setDraft((p) => ({ ...p, from: event.target.value }))
          }
        />
      </label>
      <label>
        Through (UTC)
        <input
          type="date"
          name="through"
          required
          value={draft.through}
          onChange={(event) =>
            setDraft((p) => ({ ...p, through: event.target.value }))
          }
        />
      </label>
      <div className="filter-field">
        <label htmlFor="brand">Brand</label>
        <select
          id="brand"
          name="brand"
          value={draft.brand}
          onChange={(event) =>
            setDraft((p) => ({ ...p, brand: event.target.value }))
          }
        >
          <option value="">All brands</option>
          <option value="harbor">Harbor</option>
          <option value="summit">Summit</option>
        </select>
      </div>
      <div className="filter-field">
        <label htmlFor="provider">Provider</label>
        <select
          id="provider"
          name="provider"
          value={draft.provider}
          onChange={(event) =>
            setDraft((p) => ({ ...p, provider: event.target.value }))
          }
        >
          <option value="">All providers</option>
          <option value="nova">Nova</option>
          <option value="orbit">Orbit</option>
          <option value="pulse">Pulse</option>
        </select>
      </div>
      <button type="submit">Apply filters</button>
      <a href={overviewUrl(defaultQuery)}>Reset filters</a>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
export function Overview() {
  const [search, setSearch] = useState(location.search);
  useEffect(() => {
    const update = () => setSearch(location.search);
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  const query = parseOverview(search);
  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="/">
          ◈ OpsLens
        </a>
        <nav aria-label="Main navigation">
          <a
            aria-current={location.pathname === "/" ? "page" : undefined}
            href="/"
          >
            Overview
          </a>
          <a
            aria-current={
              location.pathname === "/activity" ? "page" : undefined
            }
            href="/activity"
          >
            Activity
          </a>
        </nav>
        <span className="badge">Synthetic data</span>
      </header>
      <main id="main-content">
        {location.pathname === "/activity" ? (
          <Activity />
        ) : query ? (
          <Dashboard
            query={query}
            apply={(next) => {
              const url = overviewUrl(next);
              history.pushState(null, "", url);
              setSearch(location.search);
            }}
          />
        ) : (
          <section className="panel">
            <h1>Invalid overview filters</h1>
            <p role="alert">
              Use unique, known filters and complete UTC days with a range of at
              most 90 days.
            </p>
            <a href={overviewUrl(defaultQuery)}>Reset filters</a>
          </section>
        )}
        <footer>
          Final-status synthetic snapshot · EUR · UTC reporting · No live wagers
        </footer>
      </main>
    </div>
  );
}
function Dashboard({
  query,
  apply,
}: {
  query: Query;
  apply: (q: Query) => void;
}) {
  const [attempt, setAttempt] = useState({
    summary: 0,
    trend: 0,
    contributions: 0,
  });
  const summary = usePanel("/api/summary", query, attempt.summary);
  const trend = usePanel("/api/trend", query, attempt.trend);
  const contributions = usePanel(
    "/api/contributions",
    query,
    attempt.contributions,
  );
  const panels = [summary, trend, contributions];
  const hashes = panels.map((p) => p.data?.metadata.dataset.sha256);
  const mismatch = hashes.every(Boolean) && new Set(hashes).size > 1;
  const current =
    panels.every((p) => !!p.data && !p.stale && !p.loading && !p.error) &&
    !mismatch;
  const retry = (key: keyof typeof attempt) => () =>
    setAttempt((p) => ({ ...p, [key]: p[key] + 1 }));
  const snapshot = (
    panel: typeof summary | typeof trend | typeof contributions,
  ) =>
    panel.data && panel.scope
      ? `${scopeLabel(panel.scope)} · As of ${panel.data.metadata.dataset.asOf} · Dataset ${panel.data.metadata.dataset.sha256.slice(0, 12)}`
      : undefined;
  const previous = summary.data?.comparison;
  const hash = summary.data?.metadata.dataset.sha256 ?? "";
  const comparison = previous ?? {
    from: shiftDay(
      query.from,
      -(Date.parse(query.to) - Date.parse(query.from)) / 86400000,
    ),
    to: query.from,
  };
  const href = (q: Query) => activityUrl(q, comparison, hash, query);
  const maxTrend = Math.max(
    1,
    ...(trend.data?.days.map((d) => Math.abs(d.ggr)) ?? []),
  );
  const maxContribution = Math.max(
    1,
    ...(contributions.data?.providers.map((p) => Math.abs(p.change ?? 0)) ??
      []),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Operations intelligence</p>
          <h1>Revenue overview</h1>
          <p className="intro">Follow the change. Find the transactions.</p>
        </div>
        <div className="period">
          <strong>{range(query)}</strong>
          <span>Settled activity · EUR</span>
        </div>
      </div>
      <Filters key={JSON.stringify(query)} query={query} apply={apply} />
      <p className="active-scope">Active scope: {scopeLabel(query)}</p>
      {mismatch ? (
        <p role="alert" className="error">
          Dataset changed between panels. Drill-down paused.{" "}
          <button
            type="button"
            onClick={() =>
              setAttempt((p) => ({
                summary: p.summary + 1,
                trend: p.trend + 1,
                contributions: p.contributions + 1,
              }))
            }
          >
            Refresh all panels
          </button>
        </p>
      ) : null}
      <Panel
        title="Period metrics"
        loading={summary.loading}
        stale={summary.stale}
        error={summary.error}
        snapshot={snapshot(summary)}
        retry={retry("summary")}
      >
        {summary.data ? (
          <>
            <p className="caption">
              Compared with {range(summary.data.comparison)}
            </p>
            {summary.data.comparison.unavailableReason ? (
              <p className="state">
                Comparison unavailable · Previous period is outside the dataset
                window.
              </p>
            ) : null}
            <div className="metrics">
              {(
                [
                  ["Gross gaming revenue", "ggr"],
                  ["Settled stakes", "stakes"],
                  ["Settled payouts", "payouts"],
                  ["Active settled players", "players"],
                ] as const
              ).map(([title, key]) => (
                <article
                  key={key}
                  className={`metric ${key === "ggr" ? "primary" : ""}`}
                  aria-label={title}
                >
                  <h3>{title}</h3>
                  <p className="metric-value">
                    {key === "players"
                      ? summary.data?.current[key].toLocaleString("en-IE")
                      : money(summary.data?.current[key] ?? 0)}
                  </p>
                  <p className="delta">
                    {summary.data?.previous
                      ? `${signed(summary.data.current[key] - summary.data.previous[key], key === "players")} vs previous`
                      : "Comparison unavailable"}
                  </p>
                </article>
              ))}
            </div>
            {summary.data.current.players === 0 ? (
              <p className="state">
                No matching settled transactions. These are available zero
                totals. <a href={overviewUrl(defaultQuery)}>Reset filters</a>
              </p>
            ) : null}
            <p className="caption">
              GGR = settled stakes − settled payouts. Players are distinct
              across the whole period.
            </p>
          </>
        ) : null}
      </Panel>
      <div className="charts">
        <Panel
          title="Daily GGR"
          loading={trend.loading}
          stale={trend.stale}
          error={trend.error}
          snapshot={snapshot(trend)}
          retry={retry("trend")}
        >
          <p className="caption">
            Daily settled revenue · EUR · UTC · Select a day to investigate
          </p>
          {trend.data ? (
            <>
              <svg
                className="chart"
                viewBox="0 0 600 240"
                role="img"
                aria-label="Daily GGR chart with zero reference; exact values and activity links in the table below"
              >
                <line x1="24" x2="576" y1="110" y2="110" className="zero" />
                <text x="4" y="105">
                  0
                </text>
                {trend.data.days.map((d, i, all) => {
                  const x = 36 + i * (528 / Math.max(1, all.length - 1));
                  const y = 110 - (d.ggr / maxTrend) * 85;
                  return (
                    <g key={d.from}>
                      {i > 0 ? (
                        <line
                          x1={
                            36 + (i - 1) * (528 / Math.max(1, all.length - 1))
                          }
                          y1={110 - (all[i - 1].ggr / maxTrend) * 85}
                          x2={x}
                          y2={y}
                          className="trend-line"
                        />
                      ) : null}
                      <a
                        href={
                          current
                            ? href({ ...query, from: d.from, to: d.to })
                            : undefined
                        }
                        aria-label={`Investigate ${day(d.from)}, GGR ${money(d.ggr)}`}
                        aria-disabled={!current || undefined}
                      >
                        <circle cx={x} cy={y} r="12" fill="transparent" />
                        <circle cx={x} cy={y} r="4" className="trend-dot" />
                      </a>
                      {all.length <= 7 || i === 0 || i === all.length - 1 ? (
                        <text x={x} y="225" textAnchor="middle">
                          {day(d.from).slice(5)}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </svg>
              <details open>
                <summary>Daily values and activity links</summary>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">UTC day</th>
                        <th scope="col">GGR (EUR)</th>
                        <th scope="col">Investigate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trend.data.days.map((d) => (
                        <tr key={d.from}>
                          <th scope="row">{day(d.from)}</th>
                          <td>{money(d.ggr)}</td>
                          <td>
                            <ScopeLink
                              enabled={current}
                              href={href({ ...query, from: d.from, to: d.to })}
                              label={`View activity for ${day(d.from)}`}
                            >
                              View day →
                            </ScopeLink>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          ) : null}
        </Panel>
        <Panel
          title="Provider contribution"
          loading={contributions.loading}
          stale={contributions.stale}
          error={contributions.error}
          snapshot={snapshot(contributions)}
          retry={retry("contributions")}
        >
          <p className="caption">
            Contribution to GGR change · Signed EUR · Current minus previous
          </p>
          {contributions.data ? (
            <p className="caption">
              Compared with {range(contributions.data.comparison)}
            </p>
          ) : null}
          {contributions.data?.comparison.unavailableReason ? (
            <p className="state">
              Comparison unavailable · Previous period is outside the dataset
              window.
            </p>
          ) : contributions.data ? (
            <>
              <figure
                className="contribution-chart"
                aria-label="Provider GGR changes with central zero reference; exact values and activity links below"
              >
                {contributions.data.providers.map((p) => (
                  <a
                    className="contribution-row"
                    key={p.provider}
                    href={
                      current
                        ? href({ ...query, provider: p.provider })
                        : undefined
                    }
                    aria-label={`Investigate ${names[p.provider]}, change ${signed(p.change ?? 0)}`}
                    aria-disabled={!current || undefined}
                  >
                    <span>{names[p.provider]}</span>
                    <div className="bar-track">
                      <div
                        className={`bar ${p.change !== null && p.change < 0 ? "negative" : "positive"}`}
                        style={{
                          width: `${(Math.abs(p.change ?? 0) / maxContribution) * 48}%`,
                          left:
                            p.change !== null && p.change < 0
                              ? `${50 - (Math.abs(p.change) / maxContribution) * 48}%`
                              : "50%",
                        }}
                      />
                    </div>
                    <strong>{signed(p.change ?? 0)}</strong>
                  </a>
                ))}
                <p className="caption">
                  ← Decrease <span className="zero-label">0</span> Increase →
                </p>
              </figure>
              <details open>
                <summary>Provider values and activity links</summary>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Provider</th>
                        <th scope="col">Current GGR</th>
                        <th scope="col">Previous GGR</th>
                        <th scope="col">Change</th>
                        <th scope="col">Investigate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contributions.data.providers.map((p) => (
                        <tr key={p.provider}>
                          <th scope="row">{names[p.provider]}</th>
                          <td>{money(p.currentGgr)}</td>
                          <td>
                            {p.previousGgr === null
                              ? "Unavailable"
                              : money(p.previousGgr)}
                          </td>
                          <td>
                            {p.change === null
                              ? "Unavailable"
                              : signed(p.change)}
                          </td>
                          <td>
                            <ScopeLink
                              enabled={current}
                              href={href({ ...query, provider: p.provider })}
                              label={`View ${names[p.provider]} activity`}
                            >
                              View provider →
                            </ScopeLink>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
              {contributions.data.providers.length === 0 ? (
                <p className="state">No providers active in either period.</p>
              ) : null}
              <p className="caption">
                Contributions describe the observed change. They do not
                establish an external cause.
              </p>
            </>
          ) : null}
        </Panel>
      </div>
    </>
  );
}
