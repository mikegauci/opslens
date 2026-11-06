import { readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = {};
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
page.on("response", async (r) => {
  if (r.url().includes("/api/v1/chart/data?")) {
    const id = new URL(r.url()).searchParams.get("form_data");
    const body = await r.json();
    results[JSON.parse(id).slice_id] = body.result?.[0]?.data ?? body;
  }
});
page.on("console", (m) => {
  if (m.type() === "error")
    console.log("Browser error:", m.text().slice(0, 300));
});
await page.goto("http://127.0.0.1:8088/login/");
await page.locator("#username").fill("baseline");
await page
  .locator("#password")
  .fill(
    (
      await readFile(
        `${process.env.SUPERSET_HOME || "/tmp/opslens-superset"}/admin-password`,
        "utf8",
      )
    ).trim(),
  );
await page.locator("input[type=submit], button[type=submit]").click();
await page.waitForURL((url) => !url.pathname.includes("login"));
await page.goto("http://127.0.0.1:8088/superset/dashboard/opslens-baseline/");
for (let i = 0; i < 300 && Object.keys(results).length < 6; i++)
  await page.waitForTimeout(200);
if (
  Object.keys(results).length !== 6 ||
  Object.values(results).some((r) => !Array.isArray(r))
)
  throw new Error("Six successful chart responses required");
await page.waitForTimeout(1000);
console.log((await page.locator("body").textContent()).slice(-7000));
await page.screenshot({
  path: `superset/${process.argv[2] || "dashboard"}.png`,
  fullPage: true,
});
await writeFile(
  `superset/${process.argv[2] || "dashboard"}-results.json`,
  `${JSON.stringify(results, null, 2)}\n`,
);
await browser.close();
