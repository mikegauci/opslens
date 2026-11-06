import type pg from "pg";
import {
  type ActivityInput,
  activityQuery,
  datasetSchema,
  type Kind,
  type MetricInput,
  metricQuery,
} from "./schemas";

export class AnalyticsError extends Error {
  constructor(
    public code:
      | "INVALID_QUERY"
      | "DATASET_CHANGED"
      | "UNAVAILABLE"
      | "TIMEOUT"
      | "CANCELLED",
    message: string,
  ) {
    super(message);
  }
}
export function safeInteger(value: unknown): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number))
    throw new AnalyticsError(
      "UNAVAILABLE",
      "Analytics value exceeds integer precision",
    );
  return number;
}
const aggregate = `coalesce(sum(stake_minor),0)::text AS stakes,
 coalesce(sum(payout_minor),0)::text AS payouts,
 coalesce(sum(stake_minor-payout_minor),0)::text AS ggr,
 count(DISTINCT player_id)::text AS players`;
const table = "opslens_private.transactions";
type Query = { text: string; values: unknown[] };
// Only closed vocabulary identifiers are interpolated; all user values are parameters.
export function buildQuery(kind: Kind, q: MetricInput | ActivityInput): Query {
  const activity = kind === "activity" ? (q as ActivityInput) : null;
  const date = activity?.basis === "placement" ? "placed_at" : "settled_at";
  const start =
    kind === "contributions"
      ? new Date(2 * Date.parse(q.from) - Date.parse(q.to)).toISOString()
      : q.from;
  const values: unknown[] = [start, q.to];
  const conditions = [`${date} >= $1`, `${date} < $2`];
  const add = (column: string, value: unknown) => {
    values.push(value);
    conditions.push(`${column} = $${values.length}`);
  };
  if (!activity || activity.basis === "settlement") add("status", "settled");
  else if (activity.status) add("status", activity.status);
  if (q.brand) add("brand_id", q.brand);
  if (q.provider) add("provider_id", q.provider);
  const where = conditions.join(" AND ");
  if (activity) {
    const sort = activity.sort === "stake" ? "stake_minor" : date;
    const direction = activity.direction === "asc" ? "ASC" : "DESC";
    values.push(activity.limit + 1, activity.offset);
    return {
      text: `SELECT * FROM ${table} WHERE ${where} ORDER BY ${sort} ${direction}, id ${direction} LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    };
  }
  if (kind === "summary")
    return { text: `SELECT ${aggregate} FROM ${table} WHERE ${where}`, values };
  if (kind === "trend")
    return {
      text: `SELECT to_char(settled_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, ${aggregate} FROM ${table} WHERE ${where} GROUP BY day ORDER BY day`,
      values,
    };
  values.push(q.from);
  return {
    text: `SELECT provider_id,
    coalesce(sum(stake_minor-payout_minor) FILTER (WHERE settled_at >= $${values.length}),0)::text AS current,
    coalesce(sum(stake_minor-payout_minor) FILTER (WHERE settled_at < $${values.length}),0)::text AS previous
    FROM ${table} WHERE ${where} GROUP BY provider_id ORDER BY provider_id`,
    values,
  };
}
function totals(row: Record<string, unknown>) {
  return {
    stakes: safeInteger(row.stakes),
    payouts: safeInteger(row.payouts),
    ggr: safeInteger(row.ggr),
    players: safeInteger(row.players),
  };
}
export type QueryClient = Pick<pg.PoolClient, "query">;
export type AnalyticsService = (
  kind: Kind,
  input: unknown,
  signal?: AbortSignal,
) => Promise<unknown>;

// Shared by the HTTP adapter and future read-only tools. Caller supplies one consistent snapshot.
export async function analyze(
  client: QueryClient,
  kind: Kind,
  input: unknown,
  signal?: AbortSignal,
) {
  const parsed = (kind === "activity" ? activityQuery : metricQuery).safeParse(
    input,
  );
  if (!parsed.success)
    throw new AnalyticsError("INVALID_QUERY", "Invalid analytics query");
  const q = parsed.data;
  const run = async (query: Query) => {
    signal?.throwIfAborted();
    const result = await client.query(query);
    signal?.throwIfAborted();
    return result.rows;
  };
  const dataset = datasetSchema.parse(
    (
      await run({
        text: "SELECT manifest FROM opslens_private.dataset",
        values: [],
      })
    )[0]?.manifest,
  );
  const activity = kind === "activity" ? (q as ActivityInput) : null;
  if (q.from < dataset.from || q.to > (activity ? dataset.asOf : dataset.to))
    throw new AnalyticsError(
      "INVALID_QUERY",
      "Requested period is outside the dataset window",
    );
  if (activity?.datasetHash && activity.datasetHash !== dataset.sha256)
    throw new AnalyticsError(
      "DATASET_CHANGED",
      "Dataset changed; restart pagination",
    );
  const metadata = {
    synthetic: true as const,
    currency: "EUR" as const,
    reportingTimezone: "UTC" as const,
    dataset,
    scope: {
      from: q.from,
      to: q.to,
      ...(q.brand ? { brand: q.brand } : {}),
      ...(q.provider ? { provider: q.provider } : {}),
      basis: activity?.basis ?? "settlement",
      status:
        activity?.basis === "placement" ? (activity.status ?? null) : "settled",
    },
  };
  const previousFrom = new Date(
    2 * Date.parse(q.from) - Date.parse(q.to),
  ).toISOString();
  const available = previousFrom >= dataset.from;
  const comparison = {
    from: previousFrom,
    to: q.from,
    unavailableReason: available ? null : ("outside_dataset_window" as const),
  };
  const rows = await run(buildQuery(kind, q));
  if (activity) {
    const more = rows.length > activity.limit;
    return {
      metadata,
      rows: rows.slice(0, activity.limit).map((row) => ({
        ...row,
        placed_at: row.placed_at.toISOString(),
        settled_at: row.settled_at?.toISOString() ?? null,
        stake_minor: safeInteger(row.stake_minor),
        payout_minor:
          row.payout_minor === null ? null : safeInteger(row.payout_minor),
      })),
      page: {
        limit: activity.limit,
        offset: activity.offset,
        sort: activity.sort,
        direction: activity.direction,
        nextOffset:
          more && activity.offset + activity.limit <= 100000
            ? activity.offset + activity.limit
            : null,
        datasetHash: dataset.sha256,
      },
    };
  }
  if (kind === "summary") {
    const current = totals(rows[0]);
    const previous = available
      ? totals(
          (
            await run(
              buildQuery("summary", { ...q, from: previousFrom, to: q.from }),
            )
          )[0],
        )
      : null;
    const change = previous ? safeInteger(current.ggr - previous.ggr) : null;
    return {
      metadata,
      current,
      previous,
      comparison,
      ggrChange: change,
      ggrChangePercent:
        previous && previous.ggr > 0
          ? ((change as number) / previous.ggr) * 100
          : null,
      percentageUnavailableReason: !available
        ? "outside_dataset_window"
        : !previous || previous.ggr <= 0
          ? "nonpositive_baseline"
          : null,
    };
  }
  if (kind === "contributions")
    return {
      metadata,
      comparison,
      providers: rows.map((row) => ({
        provider: row.provider_id,
        currentGgr: safeInteger(row.current),
        previousGgr: available ? safeInteger(row.previous) : null,
        change: available
          ? safeInteger(BigInt(row.current) - BigInt(row.previous))
          : null,
      })),
    };
  const days = [];
  const byDay = new Map(rows.map((row) => [row.day, totals(row)]));
  for (let day = Date.parse(q.from); day < Date.parse(q.to); day += 86400000) {
    const from = new Date(day).toISOString();
    days.push({
      from,
      to: new Date(day + 86400000).toISOString(),
      ...(byDay.get(from.slice(0, 10)) ?? {
        stakes: 0,
        payouts: 0,
        ggr: 0,
        players: 0,
      }),
    });
  }
  return { metadata, days };
}

export function createAnalyticsService(pool: pg.Pool): AnalyticsService {
  return async (kind, input, signal) => {
    if (signal?.aborted)
      throw new AnalyticsError("CANCELLED", "Request cancelled");
    let client: pg.PoolClient;
    try {
      client = await pool.connect();
    } catch {
      if (signal?.aborted)
        throw new AnalyticsError("CANCELLED", "Request cancelled");
      throw new AnalyticsError("UNAVAILABLE", "Analytics unavailable");
    }
    let discarded = false;
    // pg has no supported AbortSignal query option. Destroy only this leased connection.
    const abort = () => {
      if (!discarded) {
        discarded = true;
        client.release(true);
      }
    };
    signal?.addEventListener("abort", abort, { once: true });
    try {
      if (signal?.aborted) {
        abort();
        throw new Error("aborted");
      }
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      await client.query("SET LOCAL statement_timeout = '3s'");
      const result = await analyze(client, kind, input, signal);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      if (signal?.aborted)
        throw new AnalyticsError("CANCELLED", "Request cancelled");
      if (error instanceof AnalyticsError) throw error;
      if ((error as { code?: string }).code === "57014")
        throw new AnalyticsError("TIMEOUT", "Analytics query timed out");
      throw new AnalyticsError("UNAVAILABLE", "Analytics unavailable");
    } finally {
      signal?.removeEventListener("abort", abort);
      if (!discarded) {
        try {
          await client.query("ROLLBACK");
        } catch {
          discarded = true;
        }
        client.release(discarded);
      }
    }
  };
}
