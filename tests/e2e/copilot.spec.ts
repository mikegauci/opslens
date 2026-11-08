import { expect, test } from "@playwright/test";
import type { CopilotEvent } from "../../packages/analytics/src/copilot";
import { summarySchema } from "../../packages/analytics/src/schemas";

const from = "2026-09-22T00:00:00.000Z";
const to = "2026-09-29T00:00:00.000Z";
const filters = new URLSearchParams({ from, to, brand: "harbor" });
const sse = (...events: CopilotEvent[]) =>
  events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");

test("keyboard can ask, handle quota, stop, confirm a new scope and follow verified evidence links", async ({
  page,
}) => {
  const analytics = await page.request.get(`/api/summary?${filters}`);
  const summary = summarySchema.parse(await analytics.json());
  const requested: { question: string; scope: { brand?: string } }[] = [];
  let releasePending!: () => void;
  const pending = new Promise<void>((resolve) => {
    releasePending = resolve;
  });
  await page.route("**/api/copilot", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ json: { available: true, documents: true } });
      return;
    }
    requested.push(route.request().postDataJSON());
    if (requested.length === 2) {
      await pending;
      await route.abort().catch(() => {});
      return;
    }
    const body =
      requested.length === 1
        ? sse({ type: "searching" }, { type: "error", code: "quota" })
        : sse(
            { type: "searching" },
            {
              type: "evidence",
              evidence: {
                id: "E1",
                kind: "comparison",
                result: summary,
                queriedAt: to,
              },
            },
            {
              type: "evidence",
              evidence: {
                id: "E2",
                kind: "activity",
                result: { metadata: summary.metadata },
                queriedAt: to,
              },
            },
            {
              type: "evidence",
              evidence: {
                id: "E3",
                kind: "document",
                queriedAt: to,
                result: {
                  documentId: "MET-GGR",
                  version: 1,
                  title: "Gross gaming revenue",
                  source: "knowledge/documents/met-ggr-v1.md",
                  excerpt: "GGR is settled stakes minus settled payouts.",
                },
              },
            },
            { type: "answering" },
            { type: "complete", answer: { references: ["E1", "E2", "E3"] } },
          );
    await route.fulfill({ contentType: "text/event-stream", body });
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Ask Copilot" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Copilot" });
  const question = dialog.getByRole("textbox", {
    name: "Question about this scope",
  });
  await expect(question).toBeFocused();
  const prompt = "What changed in GGR? Show the transactions and definition.";
  await question.fill(prompt);
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: "Ask question" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(dialog.getByRole("alert")).toContainText("request limit");
  const retry = dialog.getByRole("button", { name: "Retry question" });
  await retry.press("Enter");
  await expect.poll(() => requested.length).toBe(2);
  await dialog.getByRole("button", { name: "Stop answer" }).press("Enter");
  await expect(
    dialog.getByText("Stopped. You can retry this question."),
  ).toBeVisible();
  await expect(question).toHaveValue(prompt);
  releasePending();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await page.getByLabel("Brand", { exact: true }).selectOption("harbor");
  await page.getByRole("button", { name: "Apply filters" }).click();
  await trigger.press("Enter");
  await expect(
    dialog.getByText("Dashboard scope changed.", { exact: false }),
  ).toBeVisible();
  await expect(dialog.getByText(/All brands.*All providers/)).toBeVisible();
  await dialog
    .getByRole("button", { name: "Use current dashboard filters" })
    .press("Enter");
  await expect(
    dialog.getByText("Dashboard scope changed.", { exact: false }),
  ).toBeHidden();
  await expect(question).toBeFocused();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");

  const answer = dialog.getByRole("region", { name: "Answer", exact: true });
  const definition = answer.getByRole("link", {
    name: /Gross gaming revenue · E3/,
  });
  await definition.press("Enter");
  await expect(page.locator("#copilot-E3")).toBeFocused();
  await expect(dialog.getByRole("region", { name: "Sources" })).toContainText(
    "GGR is settled stakes minus settled payouts.",
  );
  const source = await page.request.get("/knowledge/documents/met-ggr-v1.md");
  expect(source.ok()).toBe(true);
  expect(source.headers()["content-type"]).toContain("text/plain");
  expect(await source.text()).toContain("MET-GGR");
  await expect(
    dialog.getByRole("region", { name: "Verified evidence" }),
  ).toContainText("GGR moved");
  expect(requested).toMatchObject([
    { question: prompt },
    { question: prompt },
    { question: prompt, scope: { brand: "harbor" } },
  ]);
  expect(requested[0]?.scope.brand).toBeUndefined();
  expect(requested[1]?.scope.brand).toBeUndefined();

  const activity = dialog.getByRole("link", {
    name: "View matching transactions",
  });
  const href = await activity.getAttribute("href");
  const target = new URL(href ?? "", page.url());
  expect(target.pathname).toBe("/activity");
  expect(Object.fromEntries(target.searchParams)).toMatchObject({
    from,
    to,
    brand: "harbor",
    basis: "settlement",
    status: "settled",
    datasetHash: summary.metadata.dataset.sha256,
  });
  await activity.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Activity", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("table", { name: /Transactions/ })).toBeVisible();
});

test("dashboard and placement investigation remain available without model credentials", async ({
  page,
}) => {
  await page.goto(`/activity?${filters}&basis=placement&status=pending`);
  await page.getByRole("button", { name: "Ask Copilot" }).click();
  const dialog = page.getByRole("dialog", { name: "Copilot" });
  await expect(
    dialog.getByText(/harbor.*placement time.*pending/),
  ).toBeVisible();
  await expect(dialog.getByText(/Live copilot is unavailable/)).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Ask question" }),
  ).toBeDisabled();
  await dialog.getByText("Recorded example · GGR change and Nova").click();
  await expect(
    dialog.getByText(/Fixed synthetic snapshot with 100,000 rows/),
  ).toBeVisible();
  await expect(
    dialog.getByText(/All brands.*All providers.*settlement time/),
  ).toBeVisible();
  const link = dialog.getByRole("link", {
    name: "View Nova transactions in the recorded scope",
  });
  const recordedUrl = new URL(
    (await link.getAttribute("href")) ?? "",
    page.url(),
  );
  expect(Object.fromEntries(recordedUrl.searchParams)).toEqual({
    from: "2026-09-22T00:00:00.000Z",
    to: "2026-09-29T00:00:00.000Z",
    provider: "nova",
    basis: "settlement",
    status: "settled",
    datasetHash:
      "375fd02420246a314917cfb985e2f5ca445cc3ac1595438a173fb3dabd3ea7a1",
  });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Activity", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("table", { name: /Transactions/ })).toBeVisible();

  await page.getByRole("button", { name: "Ask Copilot" }).press("Enter");
  await dialog
    .getByText("Recorded example · GGR change and Nova")
    .press("Enter");
  await link.press("Enter");
  await expect(page).toHaveURL(recordedUrl.toString());
  const transactions = page.getByRole("table", { name: /Transactions/ });
  await expect(
    transactions.getByRole("cell", { name: / \/ nova$/ }).first(),
  ).toBeVisible();
  await expect(dialog).toBeHidden();
});
