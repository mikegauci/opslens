import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { columns, csv, type Transaction } from "../data/dataset";
import { admin, replaceRows } from "./shared";

type Slice = {
  name: string;
  from: string;
  to: string;
  brand?: string;
  provider?: string;
  ids: string[];
  stakes: number;
  payouts: number;
  ggr: number;
  players: number;
};
const fixture: {
  rows: Transaction[];
  cases: Slice[];
  contributions: Record<string, number>;
} = JSON.parse(await readFile("data/fixtures/metric-oracle.json", "utf8"));
const client = admin();
await client.connect();
const app = new pg.Client({ connectionString: process.env.DATABASE_URL });
try {
  await app.connect();
  const identity = await app.query(
    "SELECT current_user AS name, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls FROM pg_roles WHERE rolname = current_user",
  );
  assert.deepEqual(identity.rows[0], {
    name: "opslens_app",
    rolsuper: false,
    rolcreatedb: false,
    rolcreaterole: false,
    rolreplication: false,
    rolbypassrls: false,
  });
  assert.equal(
    (
      await app.query(
        "SELECT * FROM pg_auth_members WHERE member = current_user::regrole",
      )
    ).rowCount,
    0,
  );
  const manifest = (
    await app.query("SELECT manifest FROM opslens_private.dataset")
  ).rows[0]?.manifest;
  assert.ok(manifest, "Run db:seed first");
  const approved = JSON.parse(await readFile("data/manifest.json", "utf8"));
  assert.deepEqual(
    manifest,
    approved.find(
      (entry: { rowCount: number }) => entry.rowCount === manifest.rowCount,
    ),
  );
  const stored = await app.query(
    `SELECT ${columns.join(",")} FROM opslens_private.transactions ORDER BY id`,
  );
  assert.equal(stored.rowCount, manifest.rowCount);
  const normalized: Transaction[] = stored.rows.map((row) => ({
    ...row,
    placed_at: row.placed_at.toISOString(),
    settled_at: row.settled_at?.toISOString() ?? null,
    stake_minor: Number(row.stake_minor),
    payout_minor: row.payout_minor === null ? null : Number(row.payout_minor),
  }));
  assert.equal(
    createHash("sha256").update(csv(normalized)).digest("hex"),
    manifest.sha256,
    "Database content must match canonical CSV hash",
  );
  const spike = await app.query(
    `SELECT provider_id, sum(stake_minor - payout_minor)::text AS ggr FROM opslens_private.transactions WHERE status = 'settled' AND settled_at >= $1 AND settled_at < $2 GROUP BY provider_id`,
    [manifest.current.from, manifest.current.to],
  );
  assert.ok(
    BigInt(spike.rows.find((row) => row.provider_id === "nova").ggr) < 0n,
  );
  assert.equal(
    (
      await app.query(
        "SELECT count(*)::integer AS n FROM opslens_private.transactions WHERE placed_at >= '2026-08-15Z' AND placed_at < '2026-08-16Z' OR settled_at >= '2026-08-15Z' AND settled_at < '2026-08-16Z'",
      )
    ).rows[0].n,
    0,
  );
  // Turn off the session default to prove GRANTs deny writes independently of read-only mode.
  await app.query("SET default_transaction_read_only = off");
  for (const sql of [
    "INSERT INTO opslens_private.transactions SELECT * FROM opslens_private.transactions LIMIT 0",
    "UPDATE opslens_private.transactions SET stake_minor = 0 WHERE false",
    "DELETE FROM opslens_private.transactions WHERE false",
    "TRUNCATE opslens_private.transactions",
    "ALTER TABLE opslens_private.transactions ADD COLUMN forbidden text",
    "DROP TABLE opslens_private.transactions",
    "CREATE TABLE opslens_private.forbidden (id integer)",
    "CREATE TABLE public.forbidden (id integer)",
    "UPDATE opslens_private.dataset SET manifest = '{}' WHERE false",
    "SELECT * FROM opslens_meta.migrations",
  ]) {
    await app.query("BEGIN");
    try {
      await assert.rejects(
        app.query(sql),
        (error: { code: string }) => error.code === "42501",
        sql,
      );
    } finally {
      await app.query("ROLLBACK");
    }
  }
  const tables = await client.query(
    "SELECT relname, relrowsecurity, pg_get_userbyid(relowner) AS owner FROM pg_class WHERE relnamespace = 'opslens_private'::regnamespace AND relkind = 'r' ORDER BY relname",
  );
  assert.equal(tables.rowCount, 2);
  for (const table of tables.rows) {
    assert.equal(table.relrowsecurity, true);
    assert.notEqual(table.owner, "opslens_app");
  }
  for (const { rolname } of (
    await client.query(
      "SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role')",
    )
  ).rows) {
    assert.equal(
      (
        await client.query(
          "SELECT has_schema_privilege($1, 'opslens_private', 'USAGE') AS allowed",
          [rolname],
        )
      ).rows[0].allowed,
      false,
    );
    for (const table of ["transactions", "dataset"]) {
      assert.equal(
        (
          await client.query(
            "SELECT has_table_privilege($1, $2, 'SELECT') AS allowed",
            [rolname, `opslens_private.${table}`],
          )
        ).rows[0].allowed,
        false,
      );
    }
  }
  // Fixture replacement is rolled back; the selected bulk dataset remains intact.
  await client.query("BEGIN");
  await replaceRows(client, fixture.rows, { fixture: true });
  await client.query("SET LOCAL ROLE opslens_app");
  for (const slice of fixture.cases) {
    const result = await client.query(
      `SELECT coalesce(array_agg(id ORDER BY id), '{}') AS ids,
      coalesce(sum(stake_minor), 0)::text AS stakes, coalesce(sum(payout_minor), 0)::text AS payouts,
      coalesce(sum(stake_minor - payout_minor), 0)::text AS ggr, count(DISTINCT player_id)::integer AS players
      FROM opslens_private.transactions WHERE status = 'settled' AND settled_at >= $1 AND settled_at < $2
      AND ($3::text IS NULL OR brand_id = $3) AND ($4::text IS NULL OR provider_id = $4)`,
      [slice.from, slice.to, slice.brand ?? null, slice.provider ?? null],
    );
    assert.deepEqual(
      result.rows[0],
      {
        ids: slice.ids,
        stakes: String(slice.stakes),
        payouts: String(slice.payouts),
        ggr: String(slice.ggr),
        players: slice.players,
      },
      slice.name,
    );
  }
  const contributions =
    await client.query(`SELECT provider_id, sum(CASE WHEN settled_at >= '2026-09-22Z' THEN stake_minor - payout_minor ELSE payout_minor - stake_minor END)::text AS change
    FROM opslens_private.transactions WHERE status = 'settled' AND settled_at >= '2026-09-15Z' AND settled_at < '2026-09-29Z' GROUP BY provider_id`);
  assert.deepEqual(
    Object.fromEntries(
      contributions.rows.map((row) => [row.provider_id, Number(row.change)]),
    ),
    fixture.contributions,
  );
  assert.equal(
    (
      await client.query(
        "SELECT count(*)::integer AS n FROM opslens_private.transactions WHERE placed_at >= '2026-09-22Z' AND placed_at < '2026-09-29Z'",
      )
    ).rows[0].n,
    6,
    "Placement slice includes pending/void and excludes l",
  );
  await client.query("RESET ROLE");
  for (const [column, value] of [
    ["payout_minor", null],
    ["stake_minor", -1],
    ["currency", "USD"],
    ["settled_at", "2020-01-01Z"],
  ]) {
    await client.query("SAVEPOINT invalid_row");
    await assert.rejects(
      client.query(
        `UPDATE opslens_private.transactions SET ${column} = $1 WHERE id = 'a'`,
        [value],
      ),
      (error: { code: string }) => error.code === "23514",
    );
    await client.query("ROLLBACK TO SAVEPOINT invalid_row");
  }
  await client.query("ROLLBACK");
  console.log(
    `Verified ${manifest.rowCount} rows/hash, golden fixture SQL, constraints, read-only grants and private-schema RLS`,
  );
} finally {
  await client.query("ROLLBACK");
  await Promise.all([client.end(), app.end()]);
}
