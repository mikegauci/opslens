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
