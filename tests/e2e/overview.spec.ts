import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import { createApp } from "../../apps/api/src/app";
import { analyze } from "../../packages/analytics/src/service";
import type { Transaction } from "../../scripts/data/dataset";
import { admin, replaceRows } from "../../scripts/db/shared";

// The unchanged literal oracle predates both the API and UI. Roll back all fixture writes.
// Intercept only transport: generated browser client -> real Hono adapter -> restricted SQL.
const fixture = JSON.parse(
  await readFile("data/fixtures/metric-oracle.json", "utf8"),
) as { rows: Transaction[] };
const manifest = JSON.parse(await readFile("data/manifest.json", "utf8"))[0];
const owner = admin();
test.beforeAll(async () => {
  await owner.connect();
  await owner.query("BEGIN");
  await replaceRows(owner, fixture.rows, {
    ...manifest,
    rowCount: 12,
    sha256: "a".repeat(64),
  });
  await owner.query("SET LOCAL ROLE opslens_app");
});
test.afterAll(async () => {
  await owner.query("ROLLBACK");
  await owner.end();
});
let queue = Promise.resolve();
const app = createApp(
  async () => 1,
  (kind, input, signal) => {
    const result = queue.then(() => analyze(owner, kind, input, signal));
    queue = result.then(
      () => {},
      () => {},
    );
    return result;
  },
);
async function oracle(page: Page) {
  await page.route(
    "**/api/{summary,trend,contributions,activity}?*",
    async (route) => {
      const url = new URL(route.request().url());
      const response = await app.request(url.pathname + url.search);
      await route.fulfill({
        status: response.status,
        contentType: "application/json",
        body: await response.text(),
      });
    },
  );
}
const base =
  "/?from=2026-09-22T00%3A00%3A00.000Z&to=2026-09-29T00%3A00%3A00.000Z";
async function ready(page: Page) {
  await expect(
    page.getByRole("link", { name: "View Nova activity", exact: true }),
  ).toBeVisible();
}

test("literal oracle renders four totals, daily values, signed provider changes and exact keyboard drill-down", async ({
  page,
}) => {
  await oracle(page);
  await page.goto(base);
  await ready(page);
  const expected = {
    "Gross gaming revenue": "-€4.00",
    "Settled stakes": "€36.00",
    "Settled payouts": "€40.00",
    "Active settled players": "4",
  };
  for (const [name, value] of Object.entries(expected))
    await expect(
      page.getByRole("article", { name }).locator(".metric-value"),
    ).toHaveText(value);
  await expect(
    page.getByRole("article", { name: "Gross gaming revenue" }),
  ).toContainText("-€7.00 vs previous");
  await expect(
    page.getByRole("article", { name: "Active settled players" }),
  ).toContainText("+2 vs previous");
  const daily = page.getByRole("region", { name: "Daily GGR", exact: true });
  await expect(daily.locator("tbody tr")).toHaveCount(7);
  await expect(daily.locator("tbody tr td:nth-child(2)")).toHaveText([
    "-€24.00",
    "€20.00",
    "€0.00",
    "€0.00",
    "€0.00",
    "€0.00",
    "€0.00",
  ]);
  const providers = page.getByRole("region", {
    name: "Provider contribution",
    exact: true,
  });
  await expect(providers.locator("tbody tr td:nth-child(4)")).toHaveText([
    "-€32.00",
    "+€25.00",
    "€0.00",
  ]);
  await page.getByLabel("Brand", { exact: true }).selectOption("harbor");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await ready(page);
  await expect(
    page
      .getByRole("article", { name: "Gross gaming revenue" })
      .locator(".metric-value"),
  ).toHaveText("-€24.00");
  const provider = page.getByRole("link", {
    name: "Investigate Nova, change -€32.00",
    exact: true,
  });
  await provider.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Activity", exact: true }),
  ).toBeVisible();
  const url = new URL(page.url());
  expect(Object.fromEntries(url.searchParams)).toMatchObject({
    from: "2026-09-22T00:00:00.000Z",
    to: "2026-09-29T00:00:00.000Z",
    brand: "harbor",
    provider: "nova",
    basis: "settlement",
    status: "settled",
    sort: "date",
    direction: "desc",
    comparisonFrom: "2026-09-15T00:00:00.000Z",
    comparisonTo: "2026-09-22T00:00:00.000Z",
    datasetHash: "a".repeat(64),
  });
  const transactionButtons = page
    .getByRole("region", { name: "Transactions", exact: true })
    .locator("tbody th button");
  await expect(transactionButtons).toHaveText([
    "Details f",
    "Details l",
    "Details d",
  ]);
  await page.reload();
  await expect(page.getByText(/harbor · nova · Settled/)).toBeVisible();
  await page.getByRole("link", { name: "Switch to comparison period" }).click();
  expect(new URL(page.url()).searchParams.get("from")).toBe(
    "2026-09-15T00:00:00.000Z",
  );
  await expect(transactionButtons).toHaveText(["Details c", "Details a"]);
  await page.getByRole("link", { name: "Return to original overview" }).click();
  await ready(page);
  await page
    .getByRole("link", { name: "View activity for 2026-09-22", exact: true })
    .click();
  expect(new URL(page.url()).searchParams.get("to")).toBe(
    "2026-09-23T00:00:00.000Z",
  );
  expect(new URL(page.url()).searchParams.get("brand")).toBe("harbor");
  await expect(transactionButtons).toHaveText(["Details l", "Details d"]);
});

test("URL filters reload and navigate back/forward; invalid and out-of-window scopes are actionable", async ({
  page,
}) => {
  await oracle(page);
  await page.goto(base);
  await ready(page);
  await page.getByLabel("Provider", { exact: true }).selectOption("pulse");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page
      .getByRole("article", { name: "Active settled players" })
      .locator(".metric-value"),
  ).toHaveText("1");
  await expect(
    page
      .getByRole("article", { name: "Settled stakes" })
      .locator(".metric-value"),
  ).toHaveText("€0.00");
  await page.reload();
  await expect(page.getByLabel("Provider", { exact: true })).toHaveValue(
    "pulse",
  );
  await page.goBack();
  await ready(page);
  await expect(
    page.getByRole("form", { name: "Overview filters" }),
  ).toHaveCount(1);
  await expect(page.getByLabel("Provider", { exact: true })).toHaveValue("");
  await page.goForward();
  await expect(page.getByLabel("Provider", { exact: true })).toHaveValue(
    "pulse",
  );
  await page.goto(`${base}&provider=nova&provider=orbit`);
  await expect(
    page.getByRole("heading", { name: "Invalid overview filters" }),
  ).toBeVisible();
  await page.goto(
    "/?from=2026-02-30T00:00:00.000Z&to=2026-03-05T00:00:00.000Z",
  );
  await expect(
    page.getByRole("heading", { name: "Invalid overview filters" }),
  ).toBeVisible();
  await page.goto(
    "/?from=2026-06-01T00:00:00.000Z&to=2026-06-02T00:00:00.000Z",
  );
  await expect(page.getByRole("alert")).toHaveCount(3);
  await expect(page.getByRole("link", { name: "Reset filters" })).toBeVisible();
});

test("zero activity and unavailable comparison remain distinct", async ({
  page,
}) => {
  await oracle(page);
  await page.goto(
    "/?from=2026-09-26T00:00:00.000Z&to=2026-09-27T00:00:00.000Z",
  );
  await expect(
    page.getByText(/No matching settled transactions/),
  ).toBeVisible();
  await expect(
    page
      .getByRole("article", { name: "Gross gaming revenue" })
      .locator(".metric-value"),
  ).toHaveText("€0.00");
  await page.goto(
    "/?from=2026-07-01T00:00:00.000Z&to=2026-07-02T00:00:00.000Z",
  );
  await expect(
    page.getByText(/Comparison unavailable · Previous period/),
  ).toHaveCount(2);
  await expect(
    page.getByRole("link", { name: "View Nova activity", exact: true }),
  ).toHaveCount(0);
});

test("initial loading, isolated failure, retry, stale scope and superseded responses", async ({
  page,
}) => {
  // Deliberately ignore AbortSignal: ownership must also reject a late delivered response.
  await page.addInitScript(() => {
    const original = window.fetch.bind(window);
    window.fetch = (input, init) =>
      original(input, { ...init, signal: new AbortController().signal });
  });
  await oracle(page);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/summary?*", async (route) => {
    await gate;
    await route.fallback();
  });
  await page.goto(base);
  await expect(
    page.getByRole("region", { name: "Period metrics" }),
  ).toContainText("Loading analytics…");
  await expect(
    page
      .getByRole("region", { name: "Daily GGR", exact: true })
      .locator("tbody tr"),
  ).toHaveCount(7);
  release();
  await ready(page);
  await page.unroute("**/api/summary?*");
  await page.route("**/api/summary?*", (route) =>
    route.fulfill({
      status: 503,
      json: { error: { code: "UNAVAILABLE", message: "Unavailable" } },
    }),
  );
  await page.getByRole("button", { name: "Refresh period metrics" }).click();
  await expect(page.getByRole("alert")).toContainText("Analytics unavailable");
  await expect(
    page.getByText("Stale results · Drill-down paused"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View Nova activity", exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole("article", { name: "Gross gaming revenue" })
      .locator(".metric-value"),
  ).toHaveText("-€4.00");
  await page.unroute("**/api/summary?*");
  await page.getByRole("button", { name: "Retry period metrics" }).click();
  await ready(page);
  let unblock: () => void = () => {};
  const delayed = new Promise<void>((resolve) => {
    unblock = resolve;
  });
  await page.route("**/api/summary?*", async (route) => {
    if (new URL(route.request().url()).searchParams.get("brand") === "harbor") {
      await delayed;
    }
    await route.fallback();
  });
  await page.getByLabel("Brand", { exact: true }).selectOption("harbor");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page
      .getByRole("region", { name: "Period metrics" })
      .getByText("Refreshing… Previous results are stale."),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Period metrics" }),
  ).toContainText("All brands");
  await page.getByLabel("Brand", { exact: true }).selectOption("summit");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page
      .getByRole("article", { name: "Gross gaming revenue" })
      .locator(".metric-value"),
  ).toHaveText("€20.00");
  const late = page.waitForResponse(
    (response) =>
      new URL(response.url()).searchParams.get("brand") === "harbor" &&
      response.url().includes("/api/summary"),
  );
  unblock();
  await (await late).finished();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(
    page.getByRole("region", { name: "Period metrics" }),
  ).toContainText("summit");
  await expect(
    page
      .getByRole("article", { name: "Gross gaming revenue" })
      .locator(".metric-value"),
  ).toHaveText("€20.00");
});

test("dataset mismatch and malformed transport fail closed; narrow view has no page overflow", async ({
  page,
}) => {
  await oracle(page);
  await page.route("**/api/trend?*", async (route) => {
    const response = await app.request(
      new URL(route.request().url()).pathname +
        new URL(route.request().url()).search,
    );
    const data = await response.json();
    data.metadata.dataset.sha256 = "b".repeat(64);
    await route.fulfill({ json: data });
  });
  await page.goto(base);
  await expect(page.getByRole("alert")).toContainText(
    "Dataset changed between panels",
  );
  await expect(
    page.getByRole("link", { name: "View Nova activity", exact: true }),
  ).toHaveCount(0);
  await page.unroute("**/api/trend?*");
  await page.getByRole("button", { name: "Refresh all panels" }).click();
  await ready(page);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/opslens-overview-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({
    path: "/tmp/opslens-overview-desktop.png",
    fullPage: true,
  });
  await page.route("**/api/trend?*", (route) =>
    route.fulfill({ json: { days: [] } }),
  );
  await page.getByRole("button", { name: "Refresh daily ggr" }).click();
  await expect(
    page
      .getByRole("region", { name: "Daily GGR", exact: true })
      .getByRole("alert"),
  ).toBeVisible();
});
