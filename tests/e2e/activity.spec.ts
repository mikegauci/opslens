import { expect, test } from "@playwright/test";

const base =
  "/activity?from=2026-09-22T00%3A00%3A00.000Z&to=2026-09-29T00%3A00%3A00.000Z";
const table = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "Transactions", exact: true });

test("100k server pages, sorting, placement pending, URL navigation and keyboard modal", async ({
  page,
  request,
}) => {
  await page.goto(base);
  await expect(table(page).getByRole("status")).toContainText(
    "100 rows loaded",
  );
  const response = await request.get(
    "/api/activity?from=2026-09-22T00%3A00%3A00.000Z&to=2026-09-29T00%3A00%3A00.000Z&limit=100",
  );
  const data = await response.json();
  expect(data.metadata.dataset.rowCount).toBe(100000);
  await expect(table(page).locator("tbody tr")).toHaveCount(100);
  const first = table(page).getByRole("button", {
    name: `Details ${data.rows[0].id}`,
    exact: true,
  });
  await first.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Transaction details" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(data.rows[0].player_id);
  await expect(
    page.getByRole("button", { name: "Close details" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  // The native dialog may briefly hand focus to browser chrome, never to the background page.
  expect(
    await dialog.evaluate(
      (node) =>
        node.contains(document.activeElement) ||
        document.activeElement === document.body,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Close details" }).focus();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(first).toBeFocused();
  const ax = await table(page).ariaSnapshot();
  expect(ax).toContain('table "Transactions, settlement time, EUR, UTC"');
  expect(ax).toContain('columnheader "Transaction"');
  expect(ax).toContain(`rowheader "Details ${data.rows[99].id}"`);
  expect(ax).toContain(`button "Details ${data.rows[0].id}"`);
  const cdp = await page.context().newCDPSession(page);
  const { nodes } = await cdp.send("Accessibility.getFullAXTree");
  const activityTable = nodes.find(
    (node) =>
      node.role?.value === "table" &&
      node.name?.value.startsWith("Transactions,"),
  );
  expect(activityTable).toBeDefined();
  expect(
    nodes.filter((node) => !node.ignored && node.role?.value === "row"),
  ).toHaveLength(101);
  await cdp.detach();
  await page.getByRole("button", { name: "Next page", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    table(page).getByRole("heading", { name: "Transactions" }),
  ).toBeFocused();
  await expect(table(page).getByRole("status")).toContainText(
    "starts at row 101",
  );
  expect(new URL(page.url()).searchParams.get("datasetHash")).toBe(
    data.page.datasetHash,
  );
  await expect(first).toHaveCount(0);
  await page.reload();
  await expect(table(page).getByRole("status")).toContainText(
    "starts at row 101",
  );
  await page.goBack();
  await expect(table(page).getByRole("status")).toContainText(
    "starts at row 1",
  );
  await page
    .getByRole("combobox", { name: "Sort", exact: true })
    .selectOption("stake");
  await page
    .getByRole("combobox", { name: "Direction", exact: true })
    .selectOption("asc");
  await page
    .getByRole("combobox", { name: "Brand", exact: true })
    .selectOption("harbor");
  await page.getByRole("button", { name: "Apply activity filters" }).click();
  await expect(table(page).getByRole("status")).toContainText(
    "100 rows loaded",
  );
  const stakes = await table(page)
    .locator("tbody tr td:nth-child(5)")
    .allTextContents();
  expect(stakes.length).toBe(100);
  const amounts = stakes.map((stake) => Number(stake.replace(/[€,]/g, "")));
  expect(amounts).toEqual(amounts.toSorted((a, b) => a - b));
  expect(new URL(page.url()).searchParams.get("sort")).toBe("stake");
  const expected = await (
    await request.get(
      `/api/activity?${new URLSearchParams({ from: data.metadata.scope.from, to: data.metadata.scope.to, brand: "harbor", sort: "stake", direction: "asc", limit: "100" })}`,
    )
  ).json();
  await expect(table(page).locator("tbody th button")).toHaveText(
    expected.rows.map((r: { id: string }) => `Details ${r.id}`),
  );
  await page
    .getByRole("combobox", { name: "Date basis" })
    .selectOption("placement");
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("pending");
  await page.getByRole("button", { name: "Apply activity filters" }).click();
  await expect(table(page).getByRole("status")).toContainText(
    "100 rows loaded",
  );
  await expect(table(page).locator("tbody tr td:nth-child(4)")).toHaveText(
    Array(100).fill("pending"),
  );
  await expect(table(page).locator("tbody tr td:nth-child(6)")).toHaveText(
    Array(100).fill("Not settled"),
  );
  await page
    .getByRole("combobox", { name: "Date basis" })
    .selectOption("settlement");
  await page.getByRole("button", { name: "Apply activity filters" }).click();
  await expect(page.getByRole("alert")).toContainText("settled status");
});

test("virtual incremental loading bounds DOM and memory window; responsive production captures", async ({
  page,
}) => {
  await page.goto(`${base}&view=virtual`);
  await expect(table(page).getByRole("status")).toContainText(
    "100 rows loaded",
  );
  expect(await table(page).locator("tbody tr").count()).toBeLessThan(25);
  const load = page.getByRole("button", { name: "Load 100 more" });
  await load.focus();
  await page.keyboard.press("Enter");
  await expect(table(page).getByRole("status")).toContainText(
    "200 rows loaded",
  );
  await expect(load).toBeFocused();
  for (let i = 3; i <= 10; i++) {
    await load.click();
    await expect(table(page).getByRole("status")).toContainText(
      `${i * 100} rows loaded`,
    );
  }
  expect(await table(page).locator("tbody tr").count()).toBeLessThan(25);
  await expect(
    page.getByRole("button", { name: "Load 100 more" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Refresh page" }).click();
  await expect(table(page).getByRole("status")).toContainText(
    "1000 rows loaded",
  );
  await table(page)
    .locator(".virtual-scroll")
    .evaluate((e) => {
      e.scrollTop = e.scrollHeight;
    });
  await expect(table(page).locator('tr[data-row-index="999"]')).toBeVisible();
  const opener = table(page).locator('tr[data-row-index="999"] button');
  await opener.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
  await page
    .getByRole("link", { name: "Continue in accessible pages" })
    .click();
  await expect(table(page).getByRole("status")).toContainText(
    "starts at row 1001",
  );
  await expect(table(page).locator("tbody tr")).toHaveCount(100);
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.screenshot({
    path: "/tmp/opslens-activity-desktop.png",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await table(page)
    .getByRole("heading", { name: "Transactions" })
    .evaluate((heading) => heading.scrollIntoView({ block: "start" }));
  await page.screenshot({
    path: "/tmp/opslens-activity-mobile.png",
  });
});

test("late delivered pages cannot replace newer filters; errors, mismatch, malformed response and empty state recover", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = window.fetch.bind(window);
    window.fetch = (input, init) =>
      original(input, { ...init, signal: new AbortController().signal });
  });
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let captured = false;
  await page.route("**/api/activity?*", async (route) => {
    if (new URL(route.request().url()).searchParams.get("brand") === "harbor") {
      const response = await route.fetch();
      captured = true;
      await gate;
      await route.fulfill({ response });
    } else await route.continue();
  });
  await page.goto(base);
  await expect(table(page).getByRole("status")).toContainText(
    "100 rows loaded",
  );
  await page
    .getByRole("combobox", { name: "Brand", exact: true })
    .selectOption("harbor");
  await page.getByRole("button", { name: "Apply activity filters" }).click();
  await expect.poll(() => captured).toBe(true);
  await expect(table(page).getByRole("status")).toContainText(
    "Loading activity",
  );
  await page
    .getByRole("combobox", { name: "Brand", exact: true })
    .selectOption("summit");
  await page.getByRole("button", { name: "Apply activity filters" }).click();
  await expect(table(page).getByRole("status")).toContainText(
    "100 rows loaded",
  );
  const late = page.waitForResponse(
    (r) =>
      r.url().includes("/api/activity") &&
      new URL(r.url()).searchParams.get("brand") === "harbor",
  );
  release();
  await (await late).finished();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(
    table(page).locator("tbody tr td:nth-child(3)").first(),
  ).toContainText("summit");
  await page.unroute("**/api/activity?*");
  await page.route("**/api/activity?*", (route) =>
    route.fulfill({
      status: 503,
      json: { error: { code: "UNAVAILABLE", message: "Unavailable" } },
    }),
  );
  await page.getByRole("button", { name: "Refresh page" }).click();
  await expect(page.getByRole("alert")).toContainText("Activity unavailable");
  await expect(table(page).locator("tbody button").first()).toBeDisabled();
  await page.unroute("**/api/activity?*");
  await page.getByRole("button", { name: "Retry page" }).click();
  await expect(table(page).getByRole("status")).toContainText(
    "100 rows loaded",
  );
  await page.route("**/api/activity?*", (route) =>
    route.fulfill({ json: { rows: [] } }),
  );
  await page.getByRole("button", { name: "Refresh page" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.unroute("**/api/activity?*");
  await page.goto(`${base}&datasetHash=${"b".repeat(64)}`);
  await expect(page.getByRole("alert")).toContainText("Dataset changed");
  await page
    .getByRole("link", { name: "Restart with latest snapshot" })
    .click();
  await expect(table(page).getByRole("status")).toContainText(
    "100 rows loaded",
  );
  await page.goto(
    "/activity?from=2026-07-01T00%3A00%3A00.000Z&to=2026-07-01T00%3A00%3A00.001Z&basis=placement&status=pending",
  );
  await expect(table(page).getByRole("status")).toContainText(
    "No matching transactions",
  );
  await page.goto(
    "/activity?from=2026-09-22T12%3A00%3A00.000Z&to=2026-09-22T15%3A00%3A00.000Z&basis=settlement",
  );
  await expect(page.locator(".active-scope")).toContainText(
    "2026-09-22T12:00:00.000Z → 2026-09-22T15:00:00.000Z exclusive",
  );
  await page.goto(`${base}&basis=settlement&status=void`);
  await expect(
    page.getByRole("heading", { name: "Invalid activity scope" }),
  ).toBeVisible();
});
