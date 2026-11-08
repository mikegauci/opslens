import { expect, test } from "@playwright/test";
import { reactRuntimeOrigin } from "../../playwright.config";

for (const react of [false, true]) {
  test(`runtime bookmark and health check work with the flag ${react ? "on" : "off"}`, async ({
    page,
    baseURL,
  }) => {
    const origin = react ? reactRuntimeOrigin : baseURL;
    const bookmark = `${origin}/migration/runtime?from=bookmark#runtime-checks`;
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    const health = page.waitForResponse(
      (response) => response.url() === `${origin}/api/health`,
    );
    const document = await page.goto(bookmark);
    expect(document?.status()).toBe(200);
    expect(document?.headers()["cache-control"]).toBe("no-store");
    // The static version has its heading in the original HTML response.
    const html = await document?.text();
    expect(html?.includes("<h1>Runtime status</h1>")).toBe(!react);
    expect(html?.includes('<div id="root"></div>')).toBe(react);

    const response = await health;
    expect(response.request().method()).toBe("GET");
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({
      database: "connected",
      result: 1,
      runtime: "node",
      synthetic: true,
      exampleGgrMinor: -150,
    });
    await expect(page).toHaveURL(bookmark);
    await expect(page).toHaveTitle("Runtime status · OpsLens");
    await expect(
      page.getByRole("heading", { name: "Runtime status" }),
    ).toBeVisible();
    const target = page.getByRole("heading", { name: "Database check" });
    const status = page.getByRole("status");
    await expect(target).toBeFocused();
    await expect(status).toHaveText("PostgreSQL connected · SELECT 1 = 1");

    await page.route("**/api/health", (route) =>
      route.fulfill({ status: 503, json: { error: "Database unavailable" } }),
    );
    await page.reload();
    await expect(page).toHaveURL(bookmark);
    await expect(target).toBeFocused();
    await expect(status).toHaveText("Database unavailable");

    await page.unroute("**/api/health");
    await page.keyboard.press("Tab");
    const retry = page.getByRole("button", { name: "Retry check" });
    await expect(retry).toBeFocused();
    await retry.press("Enter");
    await expect(status).toHaveText("PostgreSQL connected · SELECT 1 = 1");
    await expect(retry).toBeFocused();

    await page.getByRole("link", { name: "Back to Overview" }).click();
    await expect(page).toHaveURL(`${origin}/`);
    await page.goBack();
    await expect(page).toHaveURL(bookmark);
    await expect(status).toHaveText("PostgreSQL connected · SELECT 1 = 1");
    expect(errors).toEqual([]);
  });
}
