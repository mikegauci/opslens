import { activitySchema } from "@opslens/analytics/schemas";
import { api, type paths } from "@opslens/contracts";
import { AsyncState, FilterBar, Panel, StatusBadge } from "@opslens/ui";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  type ActivityScope,
  explorerUrl,
  parseActivity,
} from "./activity-scope";
import { Copilot } from "./copilot";
import { day, money, range } from "./scope";

type Result =
  paths["/api/activity"]["get"]["responses"][200]["content"]["application/json"];
type Row = Result["rows"][number];
const maxRetained = 1000;
export function Activity() {
  const [search, setSearch] = useState(location.search);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const focusResults = useRef(false);
  useEffect(() => {
    const update = () => setSearch(location.search);
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  const scope = parseActivity(search);
  function navigate(next: ActivityScope) {
    const url = explorerUrl(next);
    if (scope && url === explorerUrl(scope)) return;
    focusResults.current = true;
    history.pushState(null, "", url);
    setSearch(location.search);
  }
  useEffect(() => {
    if (focusResults.current) {
      resultsHeading.current?.focus();
      focusResults.current = false;
    }
  });
  if (scope) {
    const { from, to, brand, provider, basis, status, datasetHash } =
      scope.query;
    return (
      <>
        <div className="page-heading">
          <div>
            <p className="eyebrow">Investigation / exact scope</p>
            <h1>Activity</h1>
            <p className="intro">Inspect the transactions behind the change.</p>
          </div>
          <div className="copilot-actions">
            <a href={scope.context.origin ?? "/"}>
              Return to original overview
            </a>
            <Copilot
              dashboardScope={{
                from,
                to,
                brand,
                provider,
                basis,
                status,
                datasetHash,
              }}
            />
          </div>
        </div>
        <Explorer
          key={explorerUrl(scope)}
          scope={scope}
          navigate={navigate}
          resultsHeading={resultsHeading}
        />
      </>
    );
  }
  return (
    <Panel title="Invalid activity scope" headingLevel={1}>
      <p role="alert">
        Use unique known filters, an ordered UTC range, and compatible
        status/date basis.
      </p>
      <a href="/activity">Reset activity filters</a>
    </Panel>
  );
}
function Explorer({
  scope,
  navigate,
  resultsHeading,
}: {
  scope: ActivityScope;
  navigate: (s: ActivityScope) => void;
  resultsHeading: React.RefObject<HTMLHeadingElement | null>;
}) {
  const pageSize = scope.query.limit;
  const [result, setResult] = useState<Result>();
  const [rows, setRows] = useState<Row[]>([]);
  const [offset, setOffset] = useState(scope.query.offset);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const lockedHash = useRef(scope.query.datasetHash);
  const [selected, setSelected] = useState<{ row: Row; index: number }>();
  const [focused, setFocused] = useState<number>();
  const opener = useRef<HTMLButtonElement | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const hash = scope.query.datasetHash ?? result?.page.datasetHash;
  // biome-ignore lint/correctness/useExhaustiveDependencies: The explicit retry counter restarts the request.
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void api
      .GET("/api/activity", {
        params: {
          query: {
            ...scope.query,
            limit: String(pageSize),
            offset: String(offset),
            datasetHash: lockedHash.current,
          },
        },
        signal: controller.signal,
      })
      .then((r) => {
        if (!active) return;
        if (!r.data)
          throw new Error(
            r.response.status === 409
              ? "Dataset changed. Restart with the latest snapshot."
              : r.response.status === 400
                ? "Invalid or out-of-window scope. Adjust filters."
                : "Activity unavailable. Retry this page.",
          );
        const parsed = activitySchema.safeParse(r.data);
        if (!parsed.success)
          throw new Error("Invalid activity response. Retry this page.");
        const data = parsed.data;
        const s = data.metadata.scope;
        const q = scope.query;
        if (
          s.from !== q.from ||
          s.to !== q.to ||
          s.brand !== q.brand ||
          s.provider !== q.provider ||
          s.basis !== q.basis ||
          s.status !==
            (q.status ?? (q.basis === "settlement" ? "settled" : null)) ||
          data.page.offset !== offset ||
          data.page.limit !== pageSize ||
          data.page.sort !== q.sort ||
          data.page.direction !== q.direction ||
          data.page.datasetHash !== data.metadata.dataset.sha256 ||
          (lockedHash.current &&
            data.page.datasetHash !== lockedHash.current) ||
          (data.page.nextOffset !== null &&
            data.page.nextOffset !== offset + data.rows.length)
        )
          throw new Error(
            "Returned activity does not match the requested scope. Restart or retry.",
          );
        lockedHash.current = data.page.datasetHash;
        setRows((previous) =>
          scope.view === "virtual" && offset !== scope.query.offset
            ? [...previous.slice(0, offset - scope.query.offset), ...data.rows]
            : data.rows,
        );
        setResult(data);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (active) {
          setError(
            e instanceof Error ? e.message : "Invalid activity response.",
          );
          setLoading(false);
        }
      });
    return () => {
      active = false;
      controller.abort();
    };
    // Hash is locked by the first page; subsequent offsets always use that snapshot.
  }, [scope, offset, attempt, pageSize]);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
  }, [selected]);
  const pinnedIndex = selected?.index ?? focused;
  const virtual = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scroll.current,
    estimateSize: () => 57,
    overscan: 5,
    rangeExtractor: (range) =>
      [
        ...new Set([
          ...defaultRangeExtractor(range),
          ...(pinnedIndex === undefined ? [] : [pinnedIndex]),
        ]),
      ].sort((a, b) => a - b),
  });
  function close() {
    dialog.current?.close();
    setSelected(undefined);
    if (opener.current?.isConnected) opener.current.focus();
    else resultsHeading.current?.focus();
  }
  function change(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const p = new URLSearchParams(scope.context);
    const form = new FormData(event.currentTarget);
    for (const [k, v] of form) if (v) p.set(k, String(v));
    p.set("limit", String(pageSize));
    if (hash) p.set("datasetHash", hash);
    if (p.get("from") !== scope.query.from || p.get("to") !== scope.query.to) {
      p.delete("comparisonFrom");
      p.delete("comparisonTo");
    }
    const next = parseActivity(p.toString());
    if (next) {
      setFormError("");
      navigate(next);
    } else
      setFormError(
        "Choose valid UTC timestamps, a range of at most 90 days, and settled status for settlement basis.",
      );
  }
  const ready = !!result && !loading && !error;
  const nextOffset = result?.page.nextOffset;
  const virtualMode = scope.view === "virtual";
  const windowFull =
    virtualMode && nextOffset != null && rows.length + pageSize > maxRetained;
  const { from, to, brand, provider, basis, status } = scope.query;
  const completeDays = [from, to].every((time) =>
    time.endsWith("T00:00:00.000Z"),
  );
  const effectiveStatus =
    basis === "settlement" ? "Settled" : (status ?? "All statuses");
  const rendered = virtualMode
    ? virtual.getVirtualItems().map((v) => ({ index: v.index, start: v.start }))
    : rows.map((_, index) => ({ index, start: 0 }));
  return (
    <>
      <p className="active-scope">
        {completeDays ? range(scope.query) : `${from} → ${to} exclusive`} ·{" "}
        {brand ?? "All brands"} · {provider ?? "All providers"} ·{" "}
        {effectiveStatus} / {basis} time
      </p>
      <p className="caption">
        Exact interval: {scope.query.from} inclusive → {scope.query.to}{" "}
        exclusive. Reporting currency EUR · UTC.
      </p>
      {scope.comparison && completeDays ? (
        <p>
          Comparison scope: {day(scope.comparison.from)} →{" "}
          {day(scope.comparison.to)} exclusive · Same brand and provider.{" "}
          <a
            href={explorerUrl({
              ...scope,
              query: {
                ...scope.query,
                from: scope.comparison.from,
                to: scope.comparison.to,
                offset: 0,
              },
              context: {
                ...scope.context,
                comparisonFrom: scope.query.from,
                comparisonTo: scope.query.to,
              },
            })}
          >
            Switch to comparison period
          </a>
        </p>
      ) : null}
      <FilterBar
        className="activity-filters"
        aria-label="Activity filters"
        onSubmit={change}
      >
        <label>
          From timestamp (UTC)
          <input name="from" required defaultValue={scope.query.from} />
        </label>
        <label>
          To timestamp (UTC, exclusive)
          <input name="to" required defaultValue={scope.query.to} />
        </label>
        <label>
          Brand
          <select name="brand" defaultValue={scope.query.brand ?? ""}>
            <option value="">All brands</option>
            <option>harbor</option>
            <option>summit</option>
          </select>
        </label>
        <label>
          Provider
          <select name="provider" defaultValue={scope.query.provider ?? ""}>
            <option value="">All providers</option>
            <option>nova</option>
            <option>orbit</option>
            <option>pulse</option>
          </select>
        </label>
        <label>
          Date basis
          <select name="basis" defaultValue={scope.query.basis}>
            <option value="settlement">Settlement</option>
            <option value="placement">Placement</option>
          </select>
        </label>
        <label>
          Status
          <select
            name="status"
            defaultValue={
              scope.query.status ??
              (scope.query.basis === "settlement" ? "settled" : "")
            }
          >
            <option value="">All (placement only)</option>
            <option>settled</option>
            <option>pending</option>
            <option>void</option>
          </select>
        </label>
        <label>
          Sort
          <select name="sort" defaultValue={scope.query.sort}>
            <option value="date">Date</option>
            <option value="stake">Stake</option>
          </select>
        </label>
        <label>
          Direction
          <select name="direction" defaultValue={scope.query.direction}>
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </label>
        <button type="submit">Apply activity filters</button>
        <a href="/activity">Reset activity filters</a>
        {formError ? (
          <AsyncState variant="error">{formError}</AsyncState>
        ) : null}
      </FilterBar>
      <Panel
        title="Transactions"
        headingRef={resultsHeading}
        actions={
          <label>
            Table view
            <select
              value={scope.view}
              onChange={(e) =>
                navigate({
                  ...scope,
                  query: { ...scope.query, offset: 0 },
                  context: { ...scope.context, view: e.target.value },
                })
              }
            >
              <option value="pages">Accessible pages</option>
              <option value="virtual">Virtual scrolling</option>
            </select>
          </label>
        }
      >
        <p className="caption">
          Accessible pages shows a complete page for screen readers. Virtual
          scrolling renders rows near the viewport and keeps up to 1,000 loaded.
          Filtering and sorting run on the server.
        </p>
        <div role="status">
          {loading ? (
            <AsyncState variant="loading">Loading activity…</AsyncState>
          ) : error ? (
            <p>
              {rows.length
                ? "Activity is unavailable. Displayed rows are stale and details are paused."
                : "Activity is unavailable."}
            </p>
          ) : rows.length ? (
            <p>
              {`${rows.length} rows loaded · ${virtualMode ? "Window" : "Page"} starts at row ${scope.query.offset + 1}${nextOffset === null ? " · End of results" : ""}`}
            </p>
          ) : (
            <AsyncState variant="empty">
              No matching transactions. Adjust or reset filters.
            </AsyncState>
          )}
        </div>
        {error ? <AsyncState variant="error">{error}</AsyncState> : null}
        <button
          type="button"
          onClick={() => {
            if (!loading) setAttempt((a) => a + 1);
          }}
          aria-disabled={loading}
        >
          {error ? "Retry page" : "Refresh page"}
        </button>{" "}
        <a
          href={explorerUrl({
            ...scope,
            query: { ...scope.query, offset: 0, datasetHash: undefined },
          })}
        >
          Restart with latest snapshot
        </a>
        {result ? (
          <p className="caption">
            As of {result.metadata.dataset.asOf} · Dataset{" "}
            {result.page.datasetHash.slice(0, 12)} ·{" "}
            {result.metadata.dataset.rowCount.toLocaleString()} synthetic
            records · {scope.query.sort} {scope.query.direction}
          </p>
        ) : null}
        <section
          className={`activity-scroll ${virtualMode ? "virtual-scroll" : ""}`}
          ref={scroll}
          aria-label="Transaction table scroll area"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users need to scroll the table independently.
          tabIndex={0}
        >
          <table className="activity-table" aria-busy={loading}>
            <caption className="sr-only">
              Transactions, {scope.query.basis} time, EUR, UTC
            </caption>
            <thead>
              <tr>
                {[
                  "Transaction",
                  "Date (UTC)",
                  "Brand / provider",
                  "Status",
                  "Stake",
                  "Payout",
                ].map((h) => (
                  <th scope="col" key={h}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody
              style={
                virtualMode
                  ? { height: virtual.getTotalSize(), position: "relative" }
                  : undefined
              }
            >
              {rendered.map(({ index, start }) => {
                const row = rows[index];
                return (
                  <tr
                    key={row.id}
                    data-row-index={index}
                    style={
                      virtualMode
                        ? {
                            position: "absolute",
                            transform: `translateY(${start}px)`,
                            height: 57,
                            width: "100%",
                          }
                        : undefined
                    }
                  >
                    <th scope="row">
                      <button
                        type="button"
                        disabled={!ready}
                        onFocus={
                          virtualMode ? () => setFocused(index) : undefined
                        }
                        onBlur={
                          virtualMode ? () => setFocused(undefined) : undefined
                        }
                        onClick={(e) => {
                          opener.current = e.currentTarget;
                          setSelected({ row, index });
                        }}
                      >
                        Details {row.id}
                      </button>
                    </th>
                    <td>
                      {(scope.query.basis === "settlement"
                        ? row.settled_at
                        : row.placed_at
                      )
                        ?.replace("T", " ")
                        .replace(".000Z", "")}
                    </td>
                    <td>
                      {row.brand_id} / {row.provider_id}
                    </td>
                    <td>
                      <StatusBadge>{row.status}</StatusBadge>
                    </td>
                    <td>{money(row.stake_minor)}</td>
                    <td>
                      {row.payout_minor === null
                        ? "Not settled"
                        : money(row.payout_minor)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
        <nav className="pagination" aria-label="Activity pages">
          {!virtualMode ? (
            <button
              type="button"
              disabled={!ready || scope.query.offset === 0}
              onClick={() =>
                navigate({
                  ...scope,
                  query: {
                    ...scope.query,
                    offset: Math.max(0, scope.query.offset - pageSize),
                    datasetHash: hash,
                  },
                })
              }
            >
              Previous page
            </button>
          ) : null}
          <button
            type="button"
            aria-disabled={!ready || nextOffset == null || windowFull}
            onClick={() => {
              if (ready && nextOffset != null && !windowFull) {
                if (virtualMode) setOffset(nextOffset);
                else
                  navigate({
                    ...scope,
                    query: {
                      ...scope.query,
                      offset: nextOffset,
                      datasetHash: hash,
                    },
                  });
              }
            }}
          >
            {virtualMode ? `Load ${pageSize} more` : "Next page"}
          </button>
          {windowFull ? (
            <p>
              Memory window reached.{" "}
              <a
                href={explorerUrl({
                  ...scope,
                  query: {
                    ...scope.query,
                    offset: nextOffset,
                    datasetHash: hash,
                  },
                  context: { ...scope.context, view: "pages" },
                })}
              >
                Continue in accessible pages
              </a>
            </p>
          ) : null}
        </nav>
      </Panel>
      <dialog
        ref={dialog}
        className="drawer"
        aria-labelledby="details-title"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <button type="button" onClick={close}>
          Close details
        </button>
        <h2 id="details-title">Transaction details</h2>
        <p>Synthetic final-status snapshot · EUR · UTC</p>
        {selected ? (
          <dl>
            {Object.entries(selected.row).map(([key, value]) => (
              <div key={key}>
                <dt>{key.replaceAll("_", " ")}</dt>
                <dd>
                  {key === "stake_minor" || key === "payout_minor"
                    ? value === null
                      ? "Not settled"
                      : money(Number(value))
                    : (value ?? "Not settled")}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </dialog>
    </>
  );
}
