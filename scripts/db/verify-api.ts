import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import type pg from "pg";
import { createApp } from "../../apps/api/src/app";
import { analyze } from "../../packages/analytics/src/service";
import { createApiClient } from "../../packages/contracts/src/index";

export async function verifyApi(client: pg.Client, hash: string) {
  const fixture = JSON.parse(
    await readFile("data/fixtures/metric-oracle.json", "utf8"),
  );
  const app = createApp(
    async () => 1,
    (kind, input, signal) => analyze(client, kind, input, signal),
  );
  const request = async (path: string, query: Record<string, string>) => {
    const response = await app.request(
      `/api/${path}?${new URLSearchParams(query)}`,
    );
    assert.equal(response.status, 200, await response.clone().text());
    return response.json();
  };
  for (const slice of fixture.cases) {
    const query = {
      from: slice.from,
      to: slice.to,
      ...(slice.brand ? { brand: slice.brand } : {}),
      ...(slice.provider ? { provider: slice.provider } : {}),
    };
    const summary = await request("summary", query);
    const { holdPercent, ...totals } = summary.current;
    assert.deepEqual(
      totals,
      {
        stakes: slice.stakes,
        payouts: slice.payouts,
        ggr: slice.ggr,
        players: slice.players,
      },
      slice.name,
    );
    if (slice.holdPercent === null) {
      assert.equal(holdPercent, null, slice.name);
    } else {
      assert.equal(typeof holdPercent, "number", slice.name);
      assert.ok(Math.abs(holdPercent - slice.holdPercent) < 1e-10, slice.name);
    }
    assert.equal(summary.metadata.dataset.sha256, hash);
    assert.equal(summary.metadata.scope.basis, "settlement");
    assert.equal(summary.metadata.scope.status, "settled");
    assert.equal(summary.metadata.synthetic, true);
    const trend = await request("trend", query);
    assert.equal(
      trend.days.reduce((n: number, d: { ggr: number }) => n + d.ggr, 0),
      slice.ggr,
    );
    // Exact eligible IDs, gathered through bounded pages, independently committed in the oracle.
    for (const sort of ["date", "stake"])
      for (const direction of ["asc", "desc"]) {
        const ids: string[] = [];
        let offset: number | null = 0;
        while (offset !== null) {
          const page = await request("activity", {
            ...query,
            limit: "2",
            offset: String(offset),
            datasetHash: hash,
            sort,
            direction,
          });
          ids.push(...page.rows.map((r: { id: string }) => r.id));
          offset = page.page.nextOffset;
        }
        assert.deepEqual([...ids].sort(), slice.ids);
        assert.equal(new Set(ids).size, ids.length);
      }
  }
  const current = {
    from: "2026-09-22T00:00:00.000Z",
    to: "2026-09-29T00:00:00.000Z",
  };
  const generated = createApiClient({
    baseUrl: "http://localhost",
    fetch: async (request) => app.fetch(request),
  });
  const typed = await generated.GET("/api/summary", {
    params: { query: current },
  });
  assert.equal(typed.error, undefined);
  assert.equal(typed.data?.current.ggr, -400);
  const typedActivity = await generated.GET("/api/activity", {
    params: { query: { ...current, limit: "2" } },
  });
  assert.equal(typedActivity.data?.rows.length, 2);
  const summary = await request("summary", current);
  assert.deepEqual(summary.previous, {
    stakes: 1500,
    payouts: 1200,
    ggr: 300,
    players: 2,
    holdPercent: 20,
  });
  assert.equal(summary.ggrChange, -700);
  const contributions = await request("contributions", current);
  assert.deepEqual(
    Object.fromEntries(
      contributions.providers.map((p: { provider: string; change: number }) => [
        p.provider,
        p.change,
      ]),
    ),
    fixture.contributions,
  );
  const trend = await request("trend", current);
  assert.deepEqual(
    trend.days.map((d: { ggr: number }) => d.ggr),
    [-2400, 2000, 0, 0, 0, 0, 0],
  );
  const placement = await request("activity", {
    ...current,
    basis: "placement",
    direction: "asc",
  });
  assert.deepEqual(
    placement.rows.map((r: { id: string }) => r.id),
    ["d", "e", "j", "k", "f", "g"],
  );
  const pending = await request("activity", {
    ...current,
    basis: "placement",
    status: "pending",
  });
  assert.deepEqual(
    pending.rows.map((r: { id: string }) => r.id),
    ["j"],
  );
  const tie = await request("activity", {
    ...current,
    sort: "stake",
    direction: "asc",
  });
  assert.deepEqual(
    tie.rows.map((r: { id: string }) => r.id),
    ["g", "l", "f", "d", "e"],
  );
  const unavailable = await request("summary", {
    from: "2026-07-01T00:00:00.000Z",
    to: "2026-07-02T00:00:00.000Z",
  });
  assert.equal(unavailable.previous, null);
  assert.equal(
    unavailable.comparison.unavailableReason,
    "outside_dataset_window",
  );
  const zero = await request("summary", { ...current, provider: "pulse" });
  assert.equal(zero.ggrChangePercent, null);
  assert.equal(zero.percentageUnavailableReason, "nonpositive_baseline");
  const changed = await app.request(
    `/api/activity?${new URLSearchParams({ ...current, datasetHash: "b".repeat(64) })}`,
  );
  assert.equal(changed.status, 409);
  console.log(
    "API reconciled all literal oracle slices, hold, comparisons, daily values, contributions, placement/status and stable pagination",
  );
}
