import { writeFile } from "node:fs/promises";
import os from "node:os";
import { chromium } from "@playwright/test";

// Start the production server and real PostgreSQL first. No synthetic latency.
const browser = await chromium.launch({
  channel: process.env.PLAYWRIGHT_CHANNEL,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  const start = performance.now();
  await page.goto("http://127.0.0.1:3000/foundation");
  await page.getByText("PostgreSQL connected · SELECT 1 = 1").waitFor();
  await page.getByText("Stream complete", { exact: true }).waitFor();
  const firstJourneyMs = performance.now() - start;
  const navigation = await page.evaluate(() => {
    const entry = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType(
      "resource",
    ) as PerformanceResourceTiming[];
    return {
      domContentLoadedMs: entry.domContentLoadedEventEnd,
      documentTransferBytes: entry.transferSize,
      resourceTransferBytes: resources.reduce(
        (sum, resource) => sum + resource.transferSize,
        0,
      ),
    };
  });
  const healthRoundTripMs: number[] = [];
  for (let index = 0; index < 10; index++) {
    const before = performance.now();
    const response = await fetch("http://127.0.0.1:3000/api/health");
    if (!response.ok) throw new Error("Database probe failed");
    await response.json();
    healthRoundTripMs.push(performance.now() - before);
  }
  await page.screenshot({
    path: "/tmp/opslens-foundation-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/tmp/opslens-foundation-mobile.png",
    fullPage: true,
  });
  const result = {
    measuredAt: new Date().toISOString(),
    system: {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      cpu: os.cpus()[0].model,
      logicalCpus: os.cpus().length,
      memoryGiB: Math.round(os.totalmem() / 1024 ** 3),
      node: process.version,
    },
    browser: browser.version(),
    conditions:
      "Production Vite build + Node Hono; local loopback API and PostgreSQL 17.11; no throttling, no dataset rows; fresh browser/context, already running server; first journey includes pool warm-up and deliberate 200ms SSE delay; 10 serial health HTTP round trips after browser warmed the pool; first Node fetch includes a fresh HTTP connection, not isolated SQL timings. No cloud/cold-process claim.",
    firstJourneyMs,
    ...navigation,
    healthRoundTripMs,
  };
  await writeFile(
    "docs/foundation-baseline.json",
    `${JSON.stringify(result, null, 2)}\n`,
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
