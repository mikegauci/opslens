import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

type Slice = {
  scope: {
    name: string;
    from: string;
    to: string;
    brand?: string;
    provider?: string;
  };
  summary: { stakes: string; payouts: string; ggr: string; players: string };
  trend: { day: string; ggr: string }[];
  contributions: { provider: string; change: string }[];
};

const slices = JSON.parse(
  await readFile("superset/reconciliation.json", "utf8"),
) as Slice[];
const euros = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});
const money = (minor: string) => euros.format(Number(minor) / 100);

for (const { scope, summary, trend, contributions } of slices.filter((slice) =>
  slice.scope?.name.startsWith("100k "),
)) {
  test(`production Overview reconciles with the baseline for ${scope.name}`, async ({
    page,
  }) => {
    const { from, to, brand, provider } = scope;
    const query = new URLSearchParams({ from, to });
    if (brand) query.set("brand", brand);
    if (provider) query.set("provider", provider);
    await page.goto(`/?${query}`);

    const metrics = {
      "Settled stakes": money(summary.stakes),
      "Settled payouts": money(summary.payouts),
      "Gross gaming revenue": money(summary.ggr),
      "Active settled players": Number(summary.players).toLocaleString("en-IE"),
    };
    for (const [name, expected] of Object.entries(metrics)) {
      await expect(
        page.getByRole("article", { name }).locator(".ops-metric-value"),
      ).toHaveText(expected);
    }

    const daily = page.getByRole("region", { name: "Daily GGR", exact: true });
    const dailyRows = daily.locator("tbody tr");
    await expect(dailyRows).toHaveCount(trend.length);
    await expect(dailyRows.getByRole("rowheader")).toHaveText(
      trend.map(({ day }) => day.slice(0, 10)),
    );
    await expect(dailyRows.locator("td:first-of-type")).toHaveText(
      trend.map(({ ggr }) => money(ggr)),
    );

    const providers = page.getByRole("region", {
      name: "Provider contribution",
      exact: true,
    });
    await expect(providers.locator("tbody tr")).toHaveCount(
      contributions.length,
    );
    for (const { provider, change } of contributions) {
      const name = provider[0].toUpperCase() + provider.slice(1);
      const row = providers
        .getByRole("row")
        .filter({ has: page.getByRole("rowheader", { name, exact: true }) });
      await expect(row.locator("td:nth-of-type(3)")).toHaveText(
        `${Number(change) > 0 ? "+" : ""}${money(change)}`,
      );
    }
  });
}
