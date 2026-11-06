import { expect, test } from "@playwright/test";

test("production route crosses browser, API, PostgreSQL and streaming boundaries", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/foundation");
  await expect(
    page.getByRole("heading", { name: "A connected foundation." }),
  ).toBeVisible();
  await expect(
    page.getByText("PostgreSQL connected · SELECT 1 = 1"),
  ).toBeVisible();
  await expect(
    page.getByText("Stream complete", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Retry checks" }).click();
  await expect(
    page.getByText("Stream complete", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("PostgreSQL connected · SELECT 1 = 1"),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("API outage is visible and retry recovers", async ({ page }) => {
  await page.route("**/api/health", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"error":"Database unavailable"}',
    }),
  );
  await page.goto("/foundation");
  await expect(
    page.getByText("Database unavailable", { exact: true }),
  ).toBeVisible();
  await page.unroute("**/api/health");
  await page.getByRole("button", { name: "Retry checks" }).click();
  await expect(
    page.getByText("PostgreSQL connected · SELECT 1 = 1"),
  ).toBeVisible();
});
test("real HTTP stream flushes ready before completion", async () => {
  const response = await fetch("http://127.0.0.1:3000/api/stream");
  const reader = response.body?.getReader();
  expect(reader).toBeDefined();
  const first = await reader?.read();
  const text = new TextDecoder().decode(first?.value);
  expect(text).toContain("event: ready");
  expect(text).not.toContain("event: complete");
  await reader?.cancel();
});

test("generated analytics client crosses production HTTP and PostgreSQL boundaries", async () => {
  const { createApiClient } = await import(
    "../../packages/contracts/src/index"
  );
  const client = createApiClient({ baseUrl: "http://127.0.0.1:3000" });
  const query = {
    from: "2026-09-22T00:00:00.000Z",
    to: "2026-09-29T00:00:00.000Z",
  };
  const summary = await client.GET("/api/summary", { params: { query } });
  const trend = await client.GET("/api/trend", { params: { query } });
  const contributions = await client.GET("/api/contributions", {
    params: { query },
  });
  expect(summary.error).toBeUndefined();
  expect(trend.error).toBeUndefined();
  expect(contributions.error).toBeUndefined();
  expect(trend.data?.days.reduce((n, d) => n + d.ggr, 0)).toBe(
    summary.data?.current.ggr,
  );
  expect(
    contributions.data?.providers.reduce((n, p) => n + (p.change ?? 0), 0),
  ).toBe(summary.data?.ggrChange);
  const first = await client.GET("/api/activity", {
    params: { query: { ...query, provider: "nova", limit: "2" } },
  });
  expect(first.data?.rows).toHaveLength(2);
  expect(
    first.data?.rows.every(
      (r) => r.provider_id === "nova" && r.status === "settled",
    ),
  ).toBe(true);
  expect(first.data?.metadata.dataset.sha256).toBe(
    summary.data?.metadata.dataset.sha256,
  );
  const second = await client.GET("/api/activity", {
    params: {
      query: {
        ...query,
        provider: "nova",
        limit: "2",
        offset: String(first.data?.page.nextOffset),
        datasetHash: first.data?.page.datasetHash,
      },
    },
  });
  expect(second.error).toBeUndefined();
  expect(
    second.data?.rows.some((r) =>
      first.data?.rows.some((first) => first.id === r.id),
    ),
  ).toBe(false);
  const cancelled = new AbortController();
  cancelled.abort();
  await expect(
    client.GET("/api/summary", { params: { query }, signal: cancelled.signal }),
  ).rejects.toMatchObject({ name: "AbortError" });
});

test("production overview renders the selected bulk dataset and preserves provider drill-down", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const started = Date.now();
  await page.goto("/");
  const link = page.getByRole("link", {
    name: "View Nova activity",
    exact: true,
  });
  await expect(link).toBeVisible();
  const loaded = Date.now() - started;
  const response = await request.get(
    "/api/summary?from=2026-09-22T00:00:00.000Z&to=2026-09-29T00:00:00.000Z",
  );
  expect(response.status()).toBe(200);
  const result = await response.json();
  // Integration cross-check; exact numerical correctness is separately checked by the literal oracle.
  for (const [name, key] of [
    ["Gross gaming revenue", "ggr"],
    ["Settled stakes", "stakes"],
    ["Settled payouts", "payouts"],
  ]) {
    await expect(
      page.getByRole("article", { name }).locator(".metric-value"),
    ).toHaveText(
      new Intl.NumberFormat("en-IE", {
        style: "currency",
        currency: "EUR",
      }).format(result.current[key] / 100),
    );
  }
  expect(result.metadata.dataset.rowCount).toBe(100000);
  await page.screenshot({
    path: "/tmp/opslens-overview-100k-desktop.png",
    fullPage: true,
  });
  const filtered = Date.now();
  await page.getByLabel("Brand", { exact: true }).selectOption("harbor");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(link).toBeVisible();
  const elapsed = Date.now() - filtered;
  await link.click();
  await expect(
    page.getByRole("heading", { name: "Activity", exact: true }),
  ).toBeVisible();
  expect(new URL(page.url()).searchParams.get("brand")).toBe("harbor");
  expect(new URL(page.url()).searchParams.get("provider")).toBe("nova");
  await page.goBack();
  await expect(link).toBeVisible();
  await page.getByLabel("From (UTC)", { exact: true }).fill("2026-09-23");
  await page.getByLabel("Through (UTC)", { exact: true }).fill("2026-09-24");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await expect(link).toBeVisible();
  expect(new URL(page.url()).searchParams.get("from")).toBe(
    "2026-09-23T00:00:00.000Z",
  );
  expect(new URL(page.url()).searchParams.get("to")).toBe(
    "2026-09-25T00:00:00.000Z",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/opslens-overview-100k-mobile.png",
    fullPage: true,
  });
  console.log(
    JSON.stringify({
      datasetRows: result.metadata.dataset.rowCount,
      overviewReadyMs: loaded,
      brandApplyReadyMs: elapsed,
      conditions:
        "production build; local PostgreSQL; loopback; warm DB/pool; fresh browser; concurrent fixture/browser checks; no throttling; single sample",
    }),
  );
  expect(errors).toEqual([]);
});
