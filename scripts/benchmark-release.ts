import os from "node:os";
import { chromium } from "@playwright/test";
import { summarySchema } from "../packages/analytics/src/schemas";

// Run against a production server and warmed database. Each sample has a fresh
// browser context/cache. Keep other work off the host while collecting samples.
const baseURL = "http://127.0.0.1:3000";
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL,
});
try {
  const samples = [];
  for (let i = 0; i < 5; i++) {
    const page = await browser.newPage({
      baseURL,
      viewport: { width: 1280, height: 900 },
    });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Performance.enable");
    const memory = async () => {
      await cdp.send("HeapProfiler.collectGarbage");
      const { metrics } = await cdp.send("Performance.getMetrics");
      return metrics.find(({ name }) => name === "JSHeapUsedSize")?.value;
    };
    const link = page.getByRole("link", {
      name: "View Nova activity",
      exact: true,
    });
    const summary = page.waitForResponse((r) =>
      r.url().includes("/api/summary?"),
    );
    let started = performance.now();
    await page.goto("/");
    await link.waitFor();
    const overviewMs = performance.now() - started;
    const dataset = summarySchema.parse(await (await summary).json()).metadata
      .dataset;
    const transfer = await page.evaluate(() =>
      [
        ...performance.getEntriesByType("navigation"),
        ...performance.getEntriesByType("resource"),
      ].reduce(
        (sum, entry) => sum + (entry as PerformanceResourceTiming).transferSize,
        0,
      ),
    );
    const overviewHeapBytes = await memory();

    await page.getByLabel("Brand", { exact: true }).selectOption("harbor");
    started = performance.now();
    await page.getByRole("button", { name: "Apply filters" }).click();
    await page.waitForURL((url) => url.searchParams.get("brand") === "harbor");
    await link.and(page.locator('a[href*="brand=harbor"]')).waitFor();
    const filterMs = performance.now() - started;

    started = performance.now();
    await link.press("Enter");
    const table = page.getByRole("table", { name: /Transactions/ });
    const details = table.getByRole("button", { name: /^Details / }).first();
    await details.waitFor();
    const drillMs = performance.now() - started;
    const activityHeapBytes = await memory();
    const activityTransferBytes = await page.evaluate(() =>
      (performance.getEntriesByType("resource") as PerformanceResourceTiming[])
        .filter(({ name }) => name.includes("/api/activity?"))
        .reduce((sum, entry) => sum + entry.transferSize, 0),
    );

    started = performance.now();
    await details.press("Enter");
    await page.getByRole("dialog", { name: "Transaction details" }).waitFor();
    const detailsMs = performance.now() - started;

    samples.push({
      dataset,
      overviewMs,
      filterMs,
      drillMs,
      detailsMs,
      overviewTransferBytes: transfer,
      activityTransferBytes,
      overviewHeapBytes,
      activityHeapBytes,
    });
    await page.close();
  }
  console.log(
    JSON.stringify(
      {
        measuredAt: new Date().toISOString(),
        node: process.version,
        os: `${os.type()} ${os.release()}`,
        cpu: os.cpus()[0].model,
        logicalCpus: os.cpus().length,
        memoryGiB: os.totalmem() / 2 ** 30,
        browser: browser.version(),
        conditions:
          "Production Node and PostgreSQL on the same loopback host, no remote region, throttling or ingress compression. One browser, five serial fresh contexts, warm database/OS, running server. First browser request can open a new pool connection. Heap is total JavaScript after explicit GC. Timings include Playwright and readiness polling.",
        samples,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
