import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import { setTimeout } from "node:timers/promises";
import { chromium } from "@playwright/test";
import pg from "pg";
import { activityQuery } from "../packages/analytics/src/schemas";
import { buildQuery } from "../packages/analytics/src/service";

const server = spawn(process.execPath, ["apps/api/dist/server.js"], {
  env: { ...process.env, PORT: "3107", HOST: "127.0.0.1" },
  stdio: "ignore",
});
const exit = once(server, "exit");
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      ready = (await fetch("http://127.0.0.1:3107/api/health")).ok;
    } catch {
      /* startup */
    }
    if (ready) break;
    await setTimeout(50);
  }
  if (!ready) throw new Error("Server not ready");
  const manifest = (
    await pool.query("SELECT manifest FROM opslens_private.dataset")
  ).rows[0].manifest;
  if (manifest.rowCount !== 100000)
    throw new Error("Select the 100k seed first");
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 1000 },
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const metrics = async () => {
    await cdp.send("HeapProfiler.collectGarbage");
    const values = (await cdp.send("Performance.getMetrics")).metrics;
    return Object.fromEntries(
      values
        .filter((m) =>
          [
            "JSHeapUsedSize",
            "JSHeapTotalSize",
            "LayoutDuration",
            "RecalcStyleDuration",
            "ScriptDuration",
            "Nodes",
          ].includes(m.name),
        )
        .map((m) => [m.name, m.value]),
    );
  };
  const transfers: { bytes: number; offset: string | null }[] = [];
  const transferTasks: Promise<void>[] = [];
  page.on("response", (response) => {
    if (response.url().includes("/api/activity?"))
      transferTasks.push(
        response.body().then((body) => {
          transfers.push({
            bytes: body.byteLength,
            offset: new URL(response.url()).searchParams.get("offset"),
          });
        }),
      );
  });
  const from = "2026-09-22T00:00:00.000Z";
  const to = "2026-09-29T00:00:00.000Z";
  const start = performance.now();
  await page.goto(
    `http://127.0.0.1:3107/activity?${new URLSearchParams({ from, to, view: "virtual" })}`,
  );
  await page
    .getByRole("status")
    .filter({ hasText: "100 rows loaded" })
    .waitFor();
  const firstReadyMs = performance.now() - start;
  const first = await metrics();
  const firstDomRows = await page.locator("tbody tr").count();
  const samples = [];
  for (let i = 2; i <= 10; i++) {
    const began = performance.now();
    await page.getByRole("button", { name: "Load 100 more" }).click();
    await page
      .getByRole("status")
      .filter({ hasText: `${i * 100} rows loaded` })
      .waitFor();
    samples.push(performance.now() - began);
  }
  const loaded = await metrics();
  const loadedDomRows = await page.locator("tbody tr").count();
  const scrollStart = performance.now();
  await page.locator(".virtual-scroll").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await page.locator('tr[data-row-index="999"]').waitFor();
  const scrollToLastMs = performance.now() - scrollStart;
  const scrolled = await metrics();
  const scrolledDomRows = await page.locator("tbody tr").count();
  const resources = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((r) => r.name.includes("/api/activity?"))
      .map((r) => {
        const t = r as PerformanceResourceTiming;
        return {
          name: new URL(t.name).search,
          durationMs: t.duration,
          transferSize: t.transferSize,
          encodedBodySize: t.encodedBodySize,
          decodedBodySize: t.decodedBodySize,
        };
      }),
  );
  await Promise.all(transferTasks);
  const queryResults = [];
  for (const input of [
    { from, to, limit: "100" },
    { from, to, limit: "100", provider: "nova", brand: "harbor" },
    {
      from: manifest.from,
      to: manifest.to,
      limit: "100",
      offset: "50000",
      sort: "stake",
      datasetHash: manifest.sha256,
    },
  ]) {
    const query = buildQuery("activity", activityQuery.parse(input));
    const plan = (
      await pool.query({
        text: `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query.text}`,
        values: query.values,
      })
    ).rows[0]["QUERY PLAN"];
    queryResults.push({ input, query, plan });
  }
  await mkdir("docs/benchmarks", { recursive: true });
  await writeFile(
    "docs/benchmarks/activity-100000.json",
    `${JSON.stringify({ capturedAt: new Date().toISOString(), node: process.version, os: `${os.type()} ${os.release()}`, cpu: os.cpus()[0].model, logicalCpus: os.cpus().length, memoryGiB: os.totalmem() / 2 ** 30, browser: browser.version(), conditions: "Production Node on loopback; fresh browser, warmed pool and PostgreSQL/OS caches; concurrency one; no network/CPU throttling or ingress compression. Heap after explicit GC is total browser JS heap, not retained-row size or process RSS. Timings are single observations, not percentiles. SQL EXPLAIN samples separate from browser samples.", manifest, firstReadyMs, incrementalReadyMs: samples, firstDomRows, loadedDomRows, scrolledDomRows, scrollToLastMs, first, loaded, scrolled, transfers, resources, queryResults }, null, 2)}\n`,
  );
} finally {
  await browser?.close();
  await pool.end();
  server.kill("SIGTERM");
  await exit;
}
