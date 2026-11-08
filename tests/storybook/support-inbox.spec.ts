import { expect, test } from "@playwright/test";

test("native keyboard controls recover from an error and show an empty queue", async ({
  page,
}) => {
  await page.goto(
    "/iframe.html?id=compositions-support-inbox--retry-with-keyboard",
  );
  const inbox = page.getByRole("region", { name: "Shift handoff" });
  const queue = page.getByRole("combobox", { name: "Queue" });
  const apply = page.getByRole("button", { name: "Apply queue" });
  const retry = inbox.getByRole("button", { name: "Retry counts" });

  await expect(inbox.getByRole("alert")).toHaveText(
    "Queue counts could not be loaded.",
  );
  await page.keyboard.press("Tab");
  await expect(queue).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(apply).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(retry).toBeFocused();
  await expect(retry).toHaveCSS("outline-width", "2px");
  await page.keyboard.press("Enter");

  await expect(inbox.getByRole("alert")).toHaveCount(0);
  await expect(
    inbox.getByRole("button", { name: "Refresh counts" }),
  ).toBeFocused();
  await expect(inbox.getByRole("status")).toHaveText("12 open requests");

  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(queue).toBeFocused();
  await queue.selectOption("archive");
  await expect(queue).toHaveValue("archive");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Space");
  await expect(inbox.getByRole("status")).toHaveText(
    "No open requests. Choose another queue.",
  );
  await expect(inbox.getByRole("article")).toHaveCount(0);
});

test("loading stays visible on a narrow viewport and refresh is disabled", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/iframe.html?id=compositions-support-inbox--loading");
  const inbox = page.getByRole("region", { name: "Shift handoff" });
  await expect(inbox.getByRole("status")).toHaveText("Loading queue counts…");
  await expect(
    inbox.getByRole("button", { name: "Refresh counts" }),
  ).toBeDisabled();
  await expect(inbox.getByRole("article")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});

test("the guide renders in the built Storybook", async ({ page }) => {
  await page.goto("/?path=/docs/guide-using-opslens-ui--docs");
  const docs = page.frameLocator("#storybook-preview-iframe");
  await expect(
    docs.getByRole("heading", { name: "Theme tokens" }),
  ).toBeVisible();
  await expect(
    docs.getByRole("heading", { name: "Consuming the package" }),
  ).toBeVisible();
});
