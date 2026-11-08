import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createApp } from "../../apps/api/src/app";
import { analyze } from "../../packages/analytics/src/service";
import { admin, replaceRows } from "./shared";
import { verifyApi } from "./verify-api";

const oracle = JSON.parse(
  await readFile("data/fixtures/metric-oracle.json", "utf8"),
);
const client = admin();
await client.connect();
const evidence: unknown[] = [];
async function query(kind: string, scope: Record<string, unknown>) {
  let sql = await readFile(`superset/sql/${kind}.sql`, "utf8");
  const names = ["from", "to", "brand", "provider"];
  for (const [i, name] of names.entries())
    sql = sql.replaceAll(`%(${name})s`, `$${i + 1}`);
  return (
    await client.query(
      sql,
      names.map((name) => scope[name] ?? null),
    )
  ).rows;
}
try {
  const manifest = (
    await client.query("SELECT manifest FROM opslens_private.dataset")
  ).rows[0].manifest;
  await client.query("SET ROLE opslens_app");
  const app = createApp(
    async () => 1,
    (kind, input, signal) => analyze(client, kind, input, signal),
  );
  for (const scope of [
    { name: "100k current", ...manifest.current },
    { name: "100k harbor", ...manifest.current, brand: "harbor" },
    { name: "100k nova", ...manifest.current, provider: "nova" },
  ]) {
    const summary = (await query("summary", scope))[0];
    const trend = await query("trend", scope);
    const contributions = await query("contributions", scope);
    const params = new URLSearchParams(
      Object.entries(scope)
        .filter(([key]) => key !== "name")
        .map(([k, v]) => [k, String(v)]),
    );
    const request = async (kind: string) => {
      const response = await app.request(`/api/${kind}?${params}`);
      assert.equal(response.status, 200);
      return response.json();
    };
    // Superset's four-card baseline predates Overview hold.
    const { stakes, payouts, ggr, players } = (await request("summary"))
      .current;
    assert.deepEqual(
      { stakes, payouts, ggr, players },
      Object.fromEntries(
        Object.entries(summary).map(([k, v]) => [k, Number(v)]),
      ),
    );
    assert.deepEqual(
      (await request("trend")).days.map((d: { ggr: number }) => d.ggr),
      trend.map((d) => Number(d.ggr)),
    );
    assert.deepEqual(
      Object.fromEntries(
        (await request("contributions")).providers.map(
          (p: { provider: string; change: number }) => [p.provider, p.change],
        ),
      ),
      Object.fromEntries(
        contributions.map((p) => [p.provider, Number(p.change)]),
      ),
    );
    evidence.push({
      scope,
      summary,
      trend,
      contributions,
      datasetHash: manifest.sha256,
      apiMatch: true,
    });
  }
  await client.query("RESET ROLE");
  await client.query("BEGIN");
  await replaceRows(client, oracle.rows, { ...manifest, rowCount: 12 });
  await client.query("SET LOCAL ROLE opslens_app");
  for (const scope of oracle.cases) {
    const result = (await query("summary", scope))[0];
    for (const key of ["stakes", "payouts", "ggr", "players"])
      assert.equal(Number(result[key]), scope[key], `${scope.name}: ${key}`);
    const trend = await query("trend", scope);
    assert.equal(
      trend.reduce((sum, row) => sum + Number(row.ggr), 0),
      scope.ggr,
    );
    evidence.push({ scope, summary: result, trend });
  }
  const contributions = await query("contributions", oracle.cases[1]);
  assert.deepEqual(
    Object.fromEntries(
      contributions.map((row) => [row.provider, Number(row.change)]),
    ),
    oracle.contributions,
  );
  await verifyApi(client, manifest.sha256);
  evidence.push({
    fixtureContributions: contributions,
    apiLiteralVerification: "passed",
  });
  await client.query("ROLLBACK");
  await writeFile(
    process.argv.includes("--record")
      ? "superset/reconciliation.json"
      : "/tmp/opslens-superset-reconciliation.json",
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  console.log(
    "Independent Superset SQL reconciled unchanged literals and API; fixture writes rolled back",
  );
} finally {
  await client.query("ROLLBACK");
  await client.end();
}
