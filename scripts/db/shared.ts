import pg from "pg";
import { columns, type Transaction } from "../data/dataset";

export function admin() {
  if (!process.env.MIGRATION_DATABASE_URL)
    throw new Error(
      "MIGRATION_DATABASE_URL is required (separate from runtime DATABASE_URL)",
    );
  return new pg.Client({
    connectionString: process.env.MIGRATION_DATABASE_URL,
  });
}

// Caller owns the transaction; replacement is atomic, never append-on-rerun.
export async function replaceRows(
  client: pg.Client,
  rows: Transaction[],
  manifest: unknown,
) {
  await client.query(
    "LOCK TABLE opslens_private.dataset, opslens_private.transactions IN EXCLUSIVE MODE",
  );
  await client.query("DELETE FROM opslens_private.transactions");
  await client.query("DELETE FROM opslens_private.dataset");
  for (let offset = 0; offset < rows.length; offset += 500) {
    const batch = rows.slice(offset, offset + 500);
    const values = batch.flatMap((row) => columns.map((key) => row[key]));
    const placeholders = batch
      .map(
        (_, index) =>
          `(${columns.map((_, col) => `$${index * columns.length + col + 1}`).join(",")})`,
      )
      .join(",");
    await client.query(
      `INSERT INTO opslens_private.transactions (${columns.join(",")}) VALUES ${placeholders}`,
      values,
    );
  }
  await client.query(
    "INSERT INTO opslens_private.dataset (manifest) VALUES ($1)",
    [JSON.stringify(manifest)],
  );
}
