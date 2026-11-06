import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { admin } from "./shared";

const client = admin();
await client.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(730003)");
  await client.query("CREATE SCHEMA IF NOT EXISTS opslens_meta");
  await client.query("REVOKE ALL ON SCHEMA opslens_meta FROM PUBLIC");
  await client.query(
    "CREATE TABLE IF NOT EXISTS opslens_meta.migrations (name text PRIMARY KEY, sha256 text NOT NULL)",
  );
  for (const name of (await readdir("supabase/migrations"))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    const sql = await readFile(`supabase/migrations/${name}`, "utf8");
    const hash = createHash("sha256").update(sql).digest("hex");
    const existing = await client.query(
      "SELECT sha256 FROM opslens_meta.migrations WHERE name = $1",
      [name],
    );
    if (existing.rowCount) {
      if (existing.rows[0].sha256 !== hash)
        throw new Error(`Applied migration changed: ${name}`);
      continue;
    }
    await client.query(sql);
    await client.query("INSERT INTO opslens_meta.migrations VALUES ($1, $2)", [
      name,
      hash,
    ]);
    console.log(`Applied ${name}`);
  }
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
