import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import { setTimeout } from "node:timers/promises";
import pg from "pg";
import {
  activityQuery,
  type Kind,
  metricQuery,
} from "../packages/analytics/src/schemas";
import { buildQuery } from "../packages/analytics/src/service";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 3000,
  statement_timeout: 3000,
});
const port = "3104";
const server = spawn(process.execPath, ["apps/api/dist/server.js"], {
  env: { ...process.env, PORT: port, HOST: "127.0.0.1" },
  stdio: "ignore",
});
const exit = once(server, "exit");
const base = `http://127.0.0.1:${port}`;
const current = {
  from: "2026-09-22T00:00:00.000Z",
  to: "2026-09-29T00:00:00.000Z",
};
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      ready = (await fetch(`${base}/api/health`)).ok;
    } catch {
      /* startup */
    }
    if (ready) break;
    if (server.exitCode !== null) throw new Error("Production server exited");
    await setTimeout(50);
  }
  if (!ready) throw new Error("Production server not ready");
  const manifest = (
    await pool.query("SELECT manifest FROM opslens_private.dataset")
  ).rows[0].manifest;
  const scenarios: {
    name: string;
    kind: Kind;
    query: Record<string, string>;
  }[] = [
    { name: "summary", kind: "summary", query: current },
    { name: "trend", kind: "trend", query: current },
    { name: "contributions", kind: "contributions", query: current },
    { name: "activity_first", kind: "activity", query: current },
    {
      name: "activity_filtered",
      kind: "activity",
      query: { ...current, brand: "harbor", provider: "nova", limit: "100" },
    },
    {
      name: "activity_deep",
      kind: "activity",
      query: {
        from: manifest.from,
        to: manifest.to,
        sort: "stake",
        offset: "5000",
        datasetHash: manifest.sha256,
      },
    },
    {
      name: "placement_pending",
      kind: "activity",
      query: { ...current, basis: "placement", status: "pending" },
    },
  ];
  const results = [];
  for (const scenario of scenarios) {
    const samples = [];
    let bytes = 0;
    for (let i = 0; i < 21; i++) {
      const start = performance.now();
      const response = await fetch(
        `${base}/api/${scenario.kind}?${new URLSearchParams(scenario.query)}`,
      );
      const body = await response.text();
      if (!response.ok) throw new Error(body);
      bytes = Buffer.byteLength(body);
      samples.push(performance.now() - start);
    }
    const input =
      scenario.kind === "activity"
        ? activityQuery.parse(scenario.query)
        : metricQuery.parse(scenario.query);
    const query = buildQuery(scenario.kind, input);
    const plan = (
      await pool.query({
        text: `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query.text}`,
        values: query.values,
      })
    ).rows[0]["QUERY PLAN"];
    const warm = samples.slice(1).sort((a, b) => a - b);
    results.push({
      ...scenario,
      bytes,
      firstMs: samples[0],
      warmMedianMs: (warm[9] + warm[10]) / 2,
      warmMaxMs: warm[19],
      samplesMs: samples,
      sql: query,
      plan,
    });
  }
  const previousQuery = buildQuery("summary", {
    from: "2026-09-15T00:00:00.000Z",
    to: current.from,
  });
  const previousPlan = (
    await pool.query({
      text: `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${previousQuery.text}`,
      values: previousQuery.values,
    })
  ).rows[0]["QUERY PLAN"];
  const output = {
    capturedAt: new Date().toISOString(),
    node: process.version,
    os: `${os.type()} ${os.release()}`,
    cpu: os.cpus()[0].model,
    logicalCpus: os.cpus().length,
    memoryBytes: os.totalmem(),
    postgres: (await pool.query("SELECT version() AS version")).rows[0].version,
    conditions:
      "Production Node build; loopback PostgreSQL; restricted login; concurrency 1; 21 HTTP requests/scenario incl full JSON consumption; no throttling/compression; health warmed connection pool; DB/OS caches already warm after seed/ANALYZE, firstMs is not cold-start. Plans collected after HTTP samples, no forced planner options.",
    manifest,
    results,
    previousSummary: { sql: previousQuery, plan: previousPlan },
  };
  await mkdir("docs/benchmarks", { recursive: true });
  const path = `docs/benchmarks/analytics-${manifest.rowCount}.json`;
  await writeFile(path, `${JSON.stringify(output, null, 2)}\n`);
  console.log(path);
  for (const result of results)
    console.log(
      `${result.name}: first ${result.firstMs.toFixed(1)} ms, warm median ${result.warmMedianMs.toFixed(1)} ms, max ${result.warmMaxMs.toFixed(1)} ms, ${result.bytes} bytes`,
    );
} finally {
  server.kill("SIGTERM");
  await exit;
  await pool.end();
}
