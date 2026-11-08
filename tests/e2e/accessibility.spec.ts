import { expect, type Page, test } from "@playwright/test";
import axe from "axe-core";

declare global {
  interface Window {
    axe: typeof axe;
  }
}

async function audit(page: Page, state: string) {
  await page.evaluate(axe.source);
  const results = await page.evaluate(() =>
    window.axe.run({
      runOnly: {
        type: "tag",
        values: [
          "wcag2a",
          "wcag2aa",
          "wcag21a",
          "wcag21aa",
          "wcag22a",
          "wcag22aa",
        ],
      },
    }),
  );
  expect
    .soft(
      results.violations.map(({ id, nodes }) => ({
        id,
        elements: nodes.map(({ target, failureSummary }) => ({
          target,
          failureSummary,
        })),
      })),
      state,
    )
    .toEqual([]);
}

for (const width of [1280, 390]) {
  test(`axe checks the production investigation at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const nova = page.getByRole("link", {
      name: "View Nova activity",
      exact: true,
    });
    await expect(nova).toBeVisible();
    await audit(page, "Overview with charts and data tables");

    const chart = page.getByRole("group", { name: /^Daily GGR chart/ });
    const day = chart.getByRole("link", { name: /^Investigate 2026-09-22/ });
    await page.getByRole("button", { name: "Refresh daily ggr" }).focus();
    await page.keyboard.press("Tab");
    await expect(day).toBeFocused();

    await nova.press("Enter");
    const details = page.getByRole("button", { name: /^Details / }).first();
    await expect(details).toBeVisible();
    await audit(page, "Scoped Activity table");

    await details.press("Enter");
    await expect(
      page.getByRole("dialog", { name: "Transaction details" }),
    ).toBeVisible();
    await audit(page, "Transaction details open");
    await page.keyboard.press("Escape");
    await expect(details).toBeFocused();

    const ask = page.getByRole("button", { name: "Ask Copilot" });
    await ask.press("Enter");
    const copilot = page.getByRole("dialog", { name: "Copilot" });
    await expect(
      copilot.getByText(/Live copilot is unavailable/),
    ).toBeVisible();
    await copilot
      .getByText("Recorded example · GGR change and Nova")
      .press("Enter");
    await expect(
      copilot.getByRole("link", { name: /View Nova transactions/ }),
    ).toBeVisible();
    await audit(page, "No-key Copilot with the recorded example expanded");
    await page.keyboard.press("Escape");
    await expect(ask).toBeFocused();
  });
}
